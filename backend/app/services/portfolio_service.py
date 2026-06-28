"""Portfolio generation pipeline for ASSETS.

Ties the layers together:

    goal_text
      -> LLMService.extract_investment_brief        (NL -> structured brief)
      -> LLMService.compile_constraints             (brief -> optimizer rules)
      -> MarketDataService.fetch_ohlcv              (per candidate, cached)
      -> QuantEngine.predict_returns                (XGBoost + walk-forward)
      -> QuantEngine.optimize_portfolio             (max-Sharpe / Kelly)
      -> QuantEngine.generate_shap_explanation      (per holding)
      -> LLMService.devils_advocate_critique        (risk review)
      -> persist Portfolio + Holdings

Generation is synchronous over a bounded candidate set (see ``candidate_limit``).
For the full Nifty 50 universe this should be moved to a Celery task; the
heavy per-ticker work already runs in worker threads.
"""
from __future__ import annotations

import asyncio
import math

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.holding import Holding
from app.models.portfolio import Portfolio, PortfolioStatus, RiskLevel
from app.services.llm_service import llm_service
from app.services.market_data import NIFTY_50, market_data_service
from app.services.quant_engine import quant_engine

# Sector labels (lowercase snake_case) aligned with what the LLM emits for
# exclusions, so excluded_sectors filtering works end-to-end.
NIFTY_50_SECTORS: dict[str, str] = {
    "RELIANCE.NS": "energy", "ONGC.NS": "oil_gas", "BPCL.NS": "oil_gas",
    "COALINDIA.NS": "coal", "NTPC.NS": "power", "POWERGRID.NS": "power",
    "TCS.NS": "it", "INFY.NS": "it", "HCLTECH.NS": "it", "WIPRO.NS": "it",
    "TECHM.NS": "it", "LTIM.NS": "it",
    "HDFCBANK.NS": "financials", "ICICIBANK.NS": "financials", "SBIN.NS": "financials",
    "KOTAKBANK.NS": "financials", "AXISBANK.NS": "financials", "BAJFINANCE.NS": "financials",
    "BAJAJFINSV.NS": "financials", "INDUSINDBK.NS": "financials", "HDFCLIFE.NS": "financials",
    "SBILIFE.NS": "financials",
    "HINDUNILVR.NS": "fmcg", "ITC.NS": "fmcg", "NESTLEIND.NS": "fmcg",
    "BRITANNIA.NS": "fmcg", "TATACONSUM.NS": "fmcg",
    "MARUTI.NS": "auto", "TATAMOTORS.NS": "auto", "M&M.NS": "auto",
    "EICHERMOT.NS": "auto", "HEROMOTOCO.NS": "auto", "BAJAJ-AUTO.NS": "auto",
    "SUNPHARMA.NS": "pharma", "DRREDDY.NS": "pharma", "CIPLA.NS": "pharma",
    "DIVISLAB.NS": "pharma", "APOLLOHOSP.NS": "pharma",
    "TATASTEEL.NS": "metals", "JSWSTEEL.NS": "metals", "HINDALCO.NS": "metals",
    "ULTRACEMCO.NS": "cement", "GRASIM.NS": "cement",
    "BHARTIARTL.NS": "telecom", "ASIANPAINT.NS": "consumer", "TITAN.NS": "consumer",
    "LT.NS": "infrastructure", "ADANIENT.NS": "conglomerate",
    "ADANIPORTS.NS": "infrastructure", "UPL.NS": "chemicals",
}


class PortfolioService:
    async def generate(
        self,
        db: AsyncSession,
        user_id,
        goal_text: str,
        name: str | None = None,
        candidate_limit: int = 12,
        period: str = "2y",
    ) -> dict:
        # 1) NL -> structured brief -> optimizer constraints
        brief = await llm_service.extract_investment_brief(goal_text)
        compiled = llm_service.compile_constraints(brief)
        excluded = set(compiled["excluded_sectors"])

        # 2) Candidate universe: Nifty 50 minus excluded sectors, bounded.
        # The universe must be large enough that max_weight is feasible
        # (need >= ceil(1/max_weight) names) and meets the min_stocks target,
        # otherwise the optimizer is forced into concentration.
        max_weight = compiled["max_weight"]
        min_needed = max(compiled["min_stocks"], math.ceil(1.0 / max_weight) + 1)
        effective_limit = max(candidate_limit, min_needed)
        candidates = [
            t for t in NIFTY_50
            if NIFTY_50_SECTORS.get(t, "other") not in excluded
        ][:effective_limit]

        # 3) Fetch + predict per candidate.
        predictions: dict = {}
        for ticker in candidates:
            try:
                df = await market_data_service.fetch_ohlcv(ticker, period=period, db=db)
            except Exception:
                continue
            if df is None or len(df) < 80:
                continue
            pred = await asyncio.to_thread(quant_engine.predict_returns, ticker, df)
            pred["sector"] = NIFTY_50_SECTORS.get(ticker, "other")
            predictions[ticker] = pred

        if not predictions:
            raise ValueError("Could not build any return predictions for the candidate set.")

        # 4) Optimize.
        opt_constraints = {
            "max_weight": compiled["max_weight"],
            "excluded_sectors": compiled["excluded_sectors"],
            "sector_caps": compiled["sector_caps"],
        }
        optimized = await asyncio.to_thread(
            quant_engine.optimize_portfolio,
            list(predictions.keys()), predictions, opt_constraints,
        )
        weights = optimized.get("weights", {})

        # 5) Per-holding SHAP, building clean (JSON-safe) holding payloads.
        holdings_payload = []
        for ticker, weight in weights.items():
            pred = predictions[ticker]
            shap = quant_engine.generate_shap_explanation(
                pred.get("model"), pred.get("features"), ticker
            )
            holdings_payload.append({
                "ticker": ticker,
                "company_name": None,
                "sector": pred.get("sector"),
                "weight": round(float(weight), 4),
                "predicted_return": pred.get("predicted_return"),
                "confidence": pred.get("confidence"),
                "shap_explanation": shap,
            })

        # 6) Fetch max-period history for held tickers (stress test + charts).
        held = list(weights.keys())
        histories: dict = {}
        for ticker in held:
            try:
                df = await market_data_service.fetch_ohlcv(ticker, period="max", db=db)
                if df is not None and len(df):
                    histories[ticker] = df
            except Exception:
                pass

        # 7) Stress test.
        stress = {}
        if histories:
            stress = await asyncio.to_thread(quant_engine.stress_test, weights, histories)

        # 8) Charts data.
        charts = self._compute_charts_data(predictions, weights, compiled["max_weight"], histories)

        # 9) Devil's-advocate critique (predictions sanitised inside the LLM service).
        portfolio_summary = {
            "weights": weights,
            "expected_return": optimized.get("expected_return"),
            "volatility": optimized.get("volatility"),
            "sharpe": optimized.get("sharpe"),
        }
        try:
            critique = await llm_service.devils_advocate_critique(portfolio_summary, predictions)
        except Exception as exc:
            critique = {"warnings": [], "rationale": f"critique unavailable: {exc}", "risk_score": 5}

        # 10) Build JSON-safe predictions summary (strip non-serializable model/features).
        pred_clean: dict = {}
        for t in held:
            p = predictions.get(t, {})
            pred_clean[t] = {
                "predicted_return": p.get("predicted_return"),
                "confidence": p.get("confidence"),
                "sharpe_estimate": p.get("sharpe_estimate"),
                "max_drawdown_estimate": p.get("max_drawdown_estimate"),
                "volatility": p.get("volatility"),
                "sector": p.get("sector"),
            }

        # 11) Persist Portfolio + Holdings.
        portfolio = Portfolio(
            user_id=user_id,
            name=name or self._default_name(brief),
            goal_text=goal_text,
            amount=brief.get("amount") or 0.0,
            risk_level=RiskLevel(brief.get("risk_level", "medium")),
            horizon_years=brief.get("horizon_years"),
            constraints={
                "brief": brief,
                "compiled": compiled,
                "metrics": portfolio_summary,
                "critique": critique,
            },
            results={
                "weights": weights,
                "expected_return": optimized.get("expected_return"),
                "volatility": optimized.get("volatility"),
                "sharpe": optimized.get("sharpe"),
                "predictions": pred_clean,
                "stress_test": stress,
                "risk_warnings": critique.get("warnings", []),
                "devils_critique": critique,
                "charts_data": charts,
            },
            status=PortfolioStatus.ready,
        )
        db.add(portfolio)
        await db.flush()  # assign portfolio.id

        for h in holdings_payload:
            db.add(Holding(portfolio_id=portfolio.id, **h))

        await db.commit()

        loaded = await self.get(db, portfolio.id, user_id)
        return {
            "portfolio": loaded,
            "brief": brief,
            "constraints": compiled,
            "metrics": portfolio_summary,
            "critique": critique,
            "candidates_evaluated": len(predictions),
        }

    async def get(self, db: AsyncSession, portfolio_id, user_id) -> Portfolio | None:
        result = await db.execute(
            select(Portfolio)
            .where(Portfolio.id == portfolio_id, Portfolio.user_id == user_id)
            .options(selectinload(Portfolio.holdings))
        )
        return result.scalar_one_or_none()

    async def list_for_user(self, db: AsyncSession, user_id) -> list[Portfolio]:
        result = await db.execute(
            select(Portfolio)
            .where(Portfolio.user_id == user_id)
            .order_by(Portfolio.created_at.desc())
            .options(selectinload(Portfolio.holdings))
        )
        return list(result.scalars().all())

    async def answer_what_if(self, portfolio: Portfolio, question: str) -> str:
        metrics = (portfolio.results or {}).get("expected_return")
        if metrics is None:
            metrics = (portfolio.constraints or {}).get("metrics")
        else:
            metrics = {
                "weights": (portfolio.results or {}).get("weights"),
                "expected_return": (portfolio.results or {}).get("expected_return"),
                "volatility": (portfolio.results or {}).get("volatility"),
                "sharpe": (portfolio.results or {}).get("sharpe"),
            }
        summary = {
            "name": portfolio.name,
            "goal": portfolio.goal_text,
            "risk_level": portfolio.risk_level.value if portfolio.risk_level else None,
            "amount": portfolio.amount,
            "holdings": [
                {
                    "ticker": h.ticker,
                    "sector": h.sector,
                    "weight": h.weight,
                    "predicted_return": h.predicted_return,
                    "confidence": h.confidence,
                }
                for h in portfolio.holdings
            ],
            "metrics": metrics,
        }
        return await llm_service.answer_what_if(summary, question)

    def _compute_charts_data(
        self, predictions: dict, weights: dict, max_weight: float, histories: dict
    ) -> dict:
        import numpy as np
        tickers = list(predictions.keys())
        mu = np.array([predictions[t]["predicted_return"] * (252 / 21) for t in tickers])
        vols = np.array([quant_engine._asset_vol(predictions[t]) for t in tickers])
        rho = 0.3
        Sigma = rho * np.outer(vols, vols)
        np.fill_diagonal(Sigma, vols ** 2)

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
            "return_distribution": self._return_distribution(weights, histories),
        }

    @staticmethod
    def _return_distribution(weights: dict, histories: dict, bins: int = 20) -> list[dict]:
        import numpy as np
        import pandas as pd
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

    @staticmethod
    def _default_name(brief: dict) -> str:
        risk = brief.get("risk_level", "medium").capitalize()
        horizon = brief.get("horizon_years", 3)
        return f"{risk}-risk {horizon}y portfolio"


portfolio_service = PortfolioService()
