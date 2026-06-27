"""Full analysis pipeline for ASSETS.

This is the orchestration that the ``run_full_analysis`` Celery task (and the
in-process fallback used when no broker is available) executes. It is fully
async and creates its own DB engine/session so it can run inside a Celery worker
(``asyncio.run``) or as a background task in the API process.

Progress + status are persisted on the Portfolio row (``progress``/``status``),
so polling works regardless of how the pipeline was launched.
"""
from __future__ import annotations

import asyncio
import uuid

import numpy as np
import pandas as pd
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import selectinload
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.models.holding import Holding
from app.models.portfolio import Portfolio, PortfolioStatus, RiskLevel
from app.services.llm_service import llm_service
from app.services.market_data import NIFTY_50, market_data_service
from app.services.portfolio_service import NIFTY_50_SECTORS
from app.services.quant_engine import quant_engine

MAX_WORKERS = 20
# Bound on the candidate universe for a synchronous/in-process run. The full
# Nifty 500 universe (NIFTY_50 here stands in for it) should be run on a Celery
# worker where this can be raised.
UNIVERSE_LIMIT = 15
ANALYSIS_PERIOD = "2y"

# Hold references to fire-and-forget background tasks so they aren't GC'd.
_BACKGROUND_TASKS: set[asyncio.Task] = set()


def launch_background(coro) -> asyncio.Task:
    task = asyncio.create_task(coro)
    _BACKGROUND_TASKS.add(task)
    task.add_done_callback(_BACKGROUND_TASKS.discard)
    return task


def _chunks(seq, size):
    for i in range(0, len(seq), size):
        yield seq[i : i + size]


# --------------------------------------------------------------------------- #
# Entry point
# --------------------------------------------------------------------------- #
async def run_full_analysis_async(portfolio_id: str, task_id: str | None = None) -> None:
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    try:
        await _pipeline(Session, portfolio_id, task_id)
    except Exception as exc:  # noqa: BLE001 - record any failure for the client
        await _mark_error(Session, portfolio_id, f"{type(exc).__name__}: {exc}")
    finally:
        await engine.dispose()


async def _pipeline(Session, portfolio_id: str, task_id: str | None) -> None:
    pid = uuid.UUID(portfolio_id)

    # (a) Fetch portfolio + mark processing.
    async with Session() as s:
        portfolio = await s.get(Portfolio, pid)
        if portfolio is None:
            return
        compiled = (portfolio.constraints or {}).get("compiled") or {}
        portfolio.status = PortfolioStatus.processing
        portfolio.progress = 5
        results = dict(portfolio.results or {})
        results["task_id"] = task_id
        results["error"] = None
        portfolio.results = results
        await s.commit()

    max_weight = float(compiled.get("max_weight", 0.15))
    excluded = set(compiled.get("excluded_sectors", []))
    sector_caps = compiled.get("sector_caps", {})

    # (b) Universe = Nifty (proxy for Nifty 500) filtered by excluded sectors.
    universe = [
        t for t in NIFTY_50 if NIFTY_50_SECTORS.get(t, "other") not in excluded
    ][:UNIVERSE_LIMIT]

    # (c) Per-ticker: fetch -> indicators -> regime -> predict, max 20 in flight.
    predictions: dict = {}
    regimes: dict = {}
    total = max(1, len(universe))
    done = 0
    for batch in _chunks(universe, MAX_WORKERS):
        outcomes = await asyncio.gather(
            *[_process_ticker(Session, t) for t in batch], return_exceptions=True
        )
        for ticker, outcome in zip(batch, outcomes):
            done += 1
            if isinstance(outcome, Exception) or outcome is None:
                continue
            pred, regime = outcome
            predictions[ticker] = pred
            regimes[ticker] = regime
        await _set_progress(Session, pid, 10 + int(55 * done / total))

    if not predictions:
        await _mark_error(Session, portfolio_id, "No return predictions could be generated.")
        return

    # (d) Optimize.
    opt_constraints = {
        "max_weight": max_weight,
        "excluded_sectors": list(excluded),
        "sector_caps": sector_caps,
    }
    optimized = await asyncio.to_thread(
        quant_engine.optimize_portfolio, list(predictions.keys()), predictions, opt_constraints
    )
    weights = optimized.get("weights", {})
    await _set_progress(Session, pid, 70)

    # (e) Stress test on held names (full history, cache bypassed).
    held = list(weights.keys())
    histories = await _fetch_histories(held, period="max")
    stress = await asyncio.to_thread(quant_engine.stress_test, weights, histories)
    await _set_progress(Session, pid, 82)

    # (f) SHAP per holding.
    shap_map: dict = {}
    for ticker in held:
        p = predictions[ticker]
        shap_map[ticker] = quant_engine.generate_shap_explanation(
            p.get("model"), p.get("features"), ticker
        )
    await _set_progress(Session, pid, 88)

    # (g) Devil's-advocate critique (predictions sanitised inside LLMService).
    portfolio_metrics = {
        "weights": weights,
        "expected_return": optimized.get("expected_return"),
        "volatility": optimized.get("volatility"),
        "sharpe": optimized.get("sharpe"),
    }
    try:
        critique = await llm_service.devils_advocate_critique(portfolio_metrics, predictions)
    except Exception as exc:  # noqa: BLE001
        critique = {"warnings": [], "rationale": f"critique unavailable: {exc}", "risk_score": 5}
    await _set_progress(Session, pid, 92)

    charts = _charts_data(predictions, weights, max_weight, histories)
    pred_summary = {t: _pred_summary(predictions[t], regimes.get(t)) for t in predictions}

    # (h, i) Persist holdings + metrics, mark ready.
    async with Session() as s:
        portfolio = await s.get(Portfolio, pid)
        if portfolio is None:
            return
        await s.execute(delete(Holding).where(Holding.portfolio_id == pid))
        for ticker, weight in weights.items():
            p = predictions[ticker]
            s.add(Holding(
                portfolio_id=pid,
                ticker=ticker,
                company_name=None,
                sector=p.get("sector"),
                weight=round(float(weight), 4),
                predicted_return=p.get("predicted_return"),
                confidence=p.get("confidence"),
                shap_explanation=shap_map.get(ticker),
            ))
        results = dict(portfolio.results or {})
        results.update({
            "weights": weights,
            "expected_return": optimized.get("expected_return"),
            "volatility": optimized.get("volatility"),
            "sharpe": optimized.get("sharpe"),
            "predictions": pred_summary,
            "shap": shap_map,
            "stress_test": stress,
            "risk_warnings": critique.get("warnings", []),
            "devils_critique": critique,
            "charts_data": charts,
            "error": None,
        })
        portfolio.results = results
        portfolio.status = PortfolioStatus.ready
        portfolio.progress = 100
        await s.commit()


# --------------------------------------------------------------------------- #
# Per-ticker + history fetching
# --------------------------------------------------------------------------- #
async def _process_ticker(Session, ticker: str):
    async with Session() as s:
        df = await market_data_service.fetch_ohlcv(ticker, period=ANALYSIS_PERIOD, db=s)
    if df is None or len(df) < 80:
        return None

    def _compute():
        ind = quant_engine.compute_indicators(df)
        regime = quant_engine.detect_market_regime(df)
        pred = quant_engine.predict_returns(ticker, df, ind)
        return pred, regime

    pred, regime = await asyncio.to_thread(_compute)
    pred["sector"] = NIFTY_50_SECTORS.get(ticker, "other")
    return pred, regime


async def _fetch_histories(tickers: list[str], period: str = "max") -> dict:
    sem = asyncio.Semaphore(MAX_WORKERS)

    async def _one(ticker):
        async with sem:
            try:
                return ticker, await market_data_service.fetch_ohlcv(ticker, period=period, db=None)
            except Exception:
                return ticker, None

    out: dict = {}
    for ticker, df in await asyncio.gather(*[_one(t) for t in tickers]):
        if df is not None and len(df):
            out[ticker] = df
    return out


# --------------------------------------------------------------------------- #
# Progress / error helpers
# --------------------------------------------------------------------------- #
async def _set_progress(Session, pid: uuid.UUID, progress: int) -> None:
    async with Session() as s:
        portfolio = await s.get(Portfolio, pid)
        if portfolio is not None:
            portfolio.progress = max(int(portfolio.progress or 0), int(progress))
            await s.commit()


async def _mark_error(Session, portfolio_id: str, message: str) -> None:
    try:
        async with Session() as s:
            portfolio = await s.get(Portfolio, uuid.UUID(portfolio_id))
            if portfolio is not None:
                results = dict(portfolio.results or {})
                results["error"] = message
                portfolio.results = results
                portfolio.status = PortfolioStatus.pending
                portfolio.progress = 0
                await s.commit()
    except Exception:
        pass


# --------------------------------------------------------------------------- #
# Charts + summaries
# --------------------------------------------------------------------------- #
def _pred_summary(p: dict, regime: dict | None) -> dict:
    return {
        "predicted_return": p.get("predicted_return"),
        "confidence": p.get("confidence"),
        "sharpe_estimate": p.get("sharpe_estimate"),
        "max_drawdown_estimate": p.get("max_drawdown_estimate"),
        "volatility": p.get("volatility"),
        "sector": p.get("sector"),
        "regime": (regime or {}).get("regime"),
        "regime_confidence": (regime or {}).get("confidence"),
    }


def _charts_data(predictions: dict, weights: dict, max_weight: float, histories: dict) -> dict:
    tickers = list(predictions.keys())
    mu = np.array([predictions[t]["predicted_return"] * (252 / 21) for t in tickers])
    vols = np.array([quant_engine._asset_vol(predictions[t]) for t in tickers])
    rho = 0.3
    Sigma = rho * np.outer(vols, vols)
    np.fill_diagonal(Sigma, vols ** 2)

    # Efficient-frontier cloud (Monte Carlo over feasible-ish long-only weights).
    rng = np.random.default_rng(42)
    n = len(tickers)
    frontier = []
    for _ in range(60):
        w = rng.random(n)
        w = np.minimum(w, max_weight * 4)
        total = w.sum()
        if total <= 0:
            continue
        w = w / total
        ret = float(w @ mu)
        vol = float(np.sqrt(max(w @ Sigma @ w, 1e-9)))
        frontier.append({
            "volatility": round(vol, 4),
            "return": round(ret, 4),
            "sharpe": round(ret / vol, 3) if vol > 0 else 0.0,
        })

    sector_allocation: dict = {}
    for ticker, weight in weights.items():
        sector = predictions[ticker].get("sector", "other")
        sector_allocation[sector] = round(sector_allocation.get(sector, 0.0) + float(weight), 4)

    return {
        "efficient_frontier": frontier,
        "sector_allocation": sector_allocation,
        "return_distribution": _return_distribution(weights, histories),
    }


def _return_distribution(weights: dict, histories: dict, bins: int = 20) -> list[dict]:
    series: dict = {}
    for ticker in weights:
        df = histories.get(ticker)
        if df is None:
            continue
        close = quant_engine._series(df, "Close")
        series[ticker] = close.pct_change().dropna().iloc[-252:]
    if not series:
        return []
    rets = pd.DataFrame(series).fillna(0.0)
    ws = np.array([weights[t] for t in rets.columns])
    ws = ws / ws.sum()
    port = rets.to_numpy() @ ws
    counts, edges = np.histogram(port, bins=bins)
    return [
        {"return": round(float((edges[i] + edges[i + 1]) / 2), 5), "count": int(counts[i])}
        for i in range(len(counts))
    ]


# --------------------------------------------------------------------------- #
# Response serialization + rebalance
# --------------------------------------------------------------------------- #
def build_portfolio_json(portfolio: Portfolio) -> dict:
    r = portfolio.results or {}
    return {
        "portfolio": {
            "id": str(portfolio.id),
            "name": portfolio.name,
            "amount": portfolio.amount,
            "weights": r.get("weights", {}),
            "expected_return": r.get("expected_return"),
            "volatility": r.get("volatility"),
            "sharpe": r.get("sharpe"),
            "risk_level": portfolio.risk_level.value if portfolio.risk_level else None,
            "status": portfolio.status.value,
        },
        "holdings": [
            {
                "ticker": h.ticker,
                "company": h.company_name,
                "sector": h.sector,
                "weight": h.weight,
                "predicted_return": h.predicted_return,
                "confidence": h.confidence,
                "shap_explanation": h.shap_explanation,
            }
            for h in portfolio.holdings
        ],
        "stress_test": {"scenarios": _stress_scenarios(r.get("stress_test"))},
        "risk_warnings": r.get("risk_warnings", []),
        "devils_critique": r.get("devils_critique", {}),
        "charts_data": r.get("charts_data", {}),
    }


def _stress_scenarios(stress: dict | None) -> list[dict]:
    if not stress:
        return []
    scenarios = []
    for name, data in stress.items():
        if name == "summary" or not isinstance(data, dict):
            continue
        scenarios.append({"name": name, **data})
    return scenarios


async def rebalance(db, portfolio: Portfolio, new_risk_level: str) -> dict:
    """Re-optimize the existing predictions under a new risk level."""
    preds = (portfolio.results or {}).get("predictions") or {}
    if not preds:
        raise ValueError("No analysis results to rebalance; run /confirm first.")

    base_compiled = (portfolio.constraints or {}).get("compiled") or {}
    new_compiled = llm_service.compile_constraints({
        "risk_level": new_risk_level,
        "constraints": {"excluded_sectors": base_compiled.get("excluded_sectors", [])},
    })

    optimized = await asyncio.to_thread(
        quant_engine.optimize_portfolio,
        list(preds.keys()),
        preds,
        {
            "max_weight": new_compiled["max_weight"],
            "excluded_sectors": new_compiled["excluded_sectors"],
            "sector_caps": new_compiled["sector_caps"],
        },
    )
    weights = optimized.get("weights", {})
    shap_map = (portfolio.results or {}).get("shap", {})

    await db.execute(delete(Holding).where(Holding.portfolio_id == portfolio.id))
    for ticker, weight in weights.items():
        p = preds.get(ticker, {})
        db.add(Holding(
            portfolio_id=portfolio.id,
            ticker=ticker,
            company_name=None,
            sector=p.get("sector"),
            weight=round(float(weight), 4),
            predicted_return=p.get("predicted_return"),
            confidence=p.get("confidence"),
            shap_explanation=shap_map.get(ticker),
        ))

    portfolio.risk_level = RiskLevel(new_risk_level)
    results = dict(portfolio.results or {})
    results.update({
        "weights": weights,
        "expected_return": optimized.get("expected_return"),
        "volatility": optimized.get("volatility"),
        "sharpe": optimized.get("sharpe"),
    })
    if results.get("charts_data"):
        sector_allocation: dict = {}
        for ticker, weight in weights.items():
            sec = preds.get(ticker, {}).get("sector", "other")
            sector_allocation[sec] = round(sector_allocation.get(sec, 0.0) + float(weight), 4)
        results["charts_data"]["sector_allocation"] = sector_allocation
    portfolio.results = results
    portfolio.constraints = {**(portfolio.constraints or {}), "compiled": new_compiled}
    await db.commit()

    return {
        "portfolio_id": str(portfolio.id),
        "risk_level": new_risk_level,
        "weights": weights,
        "expected_return": optimized.get("expected_return"),
        "volatility": optimized.get("volatility"),
        "sharpe": optimized.get("sharpe"),
    }


def default_portfolio_name(brief: dict) -> str:
    risk = str(brief.get("risk_level", "medium")).capitalize()
    horizon = brief.get("horizon_years", 3)
    return f"{risk}-risk {horizon}y portfolio"
