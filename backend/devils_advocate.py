import json
import logging
import os
from datetime import datetime
from itertools import combinations

import httpx
import numpy as np
import pandas as pd
import yfinance as yf

log = logging.getLogger("quantinvest")


def analyze_portfolio_risks(allocations: list[dict], sector_to_name: dict, regime: str = "SIDEWAYS") -> dict:
    """Compute real risk metrics from live price data. No hardcoded values."""

    # filter out cash / zero-weight entries
    equity = [a for a in allocations if a.get("ticker", "CASH") != "CASH" and (a.get("weight_pct") or 0) > 0]
    total_equity_weight = sum(a["weight_pct"] for a in equity)

    # ── 1. Sector concentration ──────────────────────────────────────────────
    sector_weights: dict[str, float] = {}
    for a in equity:
        sector = sector_to_name.get(a["ticker"], "Other")
        sector_weights[sector] = sector_weights.get(sector, 0) + a["weight_pct"]

    top_sector = max(sector_weights, key=sector_weights.get) if sector_weights else "Unknown"
    top_sector_weight = round(sector_weights.get(top_sector, 0), 1)
    sector_over_concentrated = top_sector_weight > 40

    # ── 2. Single-stock concentration ───────────────────────────────────────
    top_holding = max(equity, key=lambda a: a["weight_pct"]) if equity else {}
    top_holding_name = top_holding.get("name", "Unknown")
    top_holding_ticker = top_holding.get("ticker", "")
    top_holding_weight = round(top_holding.get("weight_pct", 0), 1)
    single_stock_flag = top_holding_weight > 25

    # ── 3. Real correlation analysis ─────────────────────────────────────────
    tickers = [a["ticker"] for a in equity]
    corr_data = {}
    highest_pair = ("—", "—")
    highest_corr = 0.0
    avg_corr = 0.0
    high_corr_flag = False
    avg_corr_flag = False

    if len(tickers) >= 2:
        try:
            raw = yf.download(tickers, period="1y", interval="1d", auto_adjust=True, progress=False)
            if isinstance(raw.columns, pd.MultiIndex):
                prices = raw.xs("Close", axis=1, level=0)
            else:
                prices = raw[["Close"]] if len(tickers) == 1 else raw

            prices = prices.dropna(axis=1, how="all").dropna(how="any")
            returns = prices.pct_change().dropna()

            if returns.shape[1] >= 2:
                corr_matrix = returns.corr()
                pairs = list(combinations(corr_matrix.columns, 2))
                pair_corrs = {(a, b): round(float(corr_matrix.loc[a, b]), 3) for a, b in pairs}

                if pair_corrs:
                    best_pair = max(pair_corrs, key=pair_corrs.get)
                    highest_corr = pair_corrs[best_pair]
                    highest_pair = best_pair

                    off_diag = [v for v in pair_corrs.values()]
                    avg_corr = round(float(np.mean(off_diag)), 3)

                    high_corr_flag = highest_corr > 0.8
                    avg_corr_flag = avg_corr > 0.6

        except Exception as e:
            log.warning("Correlation analysis failed: %s", e)

    # ── 4. Effective diversification ─────────────────────────────────────────
    real_positions = [a for a in equity if a["weight_pct"] > 5]
    effective_count = len(real_positions)
    low_diversification = effective_count < 4

    # ── 5. Regime vulnerability ──────────────────────────────────────────────
    cash_weight = sum(a.get("weight_pct", 0) for a in allocations if a.get("ticker") == "CASH")
    regime_mismatch = (
        (regime == "BULL" and top_sector_weight > 50) or
        (regime in ("BEAR", "HIGH_VOLATILITY") and cash_weight < 20)
    )

    return {
        "top_sector": top_sector,
        "top_sector_weight": top_sector_weight,
        "sector_over_concentrated": sector_over_concentrated,
        "sector_weights": sector_weights,
        "top_holding_name": top_holding_name,
        "top_holding_ticker": top_holding_ticker,
        "top_holding_weight": top_holding_weight,
        "single_stock_flag": single_stock_flag,
        "highest_corr_pair": list(highest_pair),
        "highest_corr": highest_corr,
        "avg_corr": avg_corr,
        "high_corr_flag": high_corr_flag,
        "avg_corr_flag": avg_corr_flag,
        "effective_count": effective_count,
        "low_diversification": low_diversification,
        "cash_weight": round(cash_weight, 1),
        "regime": regime,
        "regime_mismatch": regime_mismatch,
        "total_equity_weight": round(total_equity_weight, 1),
    }


def _deterministic_warnings(metrics: dict) -> list[dict]:
    """Generate grounded warnings from real metrics when Groq is unavailable."""
    warnings = []

    if metrics["sector_over_concentrated"]:
        warnings.append({
            "severity": "high",
            "title": "Sector Over-Concentration",
            "critique": (
                f"{metrics['top_sector_weight']}% of your portfolio is in {metrics['top_sector']}. "
                f"A single sector shock wipes out that portion immediately — this is not diversification."
            ),
        })

    if metrics["single_stock_flag"]:
        warnings.append({
            "severity": "high",
            "title": "Single-Stock Dominance",
            "critique": (
                f"{metrics['top_holding_name']} takes {metrics['top_holding_weight']}% of your portfolio. "
                f"A 20% drop in that one stock shaves {round(metrics['top_holding_weight'] * 0.2, 1)}% off your total capital."
            ),
        })

    if metrics["high_corr_flag"]:
        t1, t2 = metrics["highest_corr_pair"]
        warnings.append({
            "severity": "high",
            "title": "Redundant Holdings",
            "critique": (
                f"{t1.replace('.NS','')} and {t2.replace('.NS','')} have a {metrics['highest_corr']:.2f} correlation "
                f"(computed from 1-year daily returns) — they move almost identically. You are paying for two positions but getting the risk of one."
            ),
        })
    elif metrics["avg_corr_flag"]:
        warnings.append({
            "severity": "medium",
            "title": "Portfolio Moves as One Block",
            "critique": (
                f"Average pairwise correlation across your holdings is {metrics['avg_corr']:.2f} "
                f"(above 0.6 threshold). In a market sell-off, these stocks fall together — diversification is largely illusory."
            ),
        })

    if metrics["low_diversification"]:
        warnings.append({
            "severity": "medium",
            "title": "Too Few Real Positions",
            "critique": (
                f"Only {metrics['effective_count']} holdings have >5% weight. "
                f"Academic research shows you need at least 15–20 uncorrelated stocks to reduce idiosyncratic risk meaningfully."
            ),
        })

    if metrics["regime_mismatch"]:
        regime = metrics["regime"]
        if regime == "BULL" and metrics["top_sector_weight"] > 50:
            warnings.append({
                "severity": "medium",
                "title": "Concentration Risk in a Bull Run",
                "critique": (
                    f"Even in a bull market ({regime}), having {metrics['top_sector_weight']}% in {metrics['top_sector']} "
                    f"means a sector-specific shock (regulation, earnings miss) can erase your gains despite the broad trend."
                ),
            })
        elif regime in ("BEAR", "HIGH_VOLATILITY") and metrics["cash_weight"] < 20:
            warnings.append({
                "severity": "high",
                "title": "Insufficient Cash Buffer in Falling Market",
                "critique": (
                    f"Only {metrics['cash_weight']}% cash in a {regime} regime. "
                    f"Standard defensive positioning calls for 20–30% cash to absorb drawdowns and buy dips."
                ),
            })

    # always return at least one warning
    if not warnings:
        warnings.append({
            "severity": "low",
            "title": "Correlation Risk Present",
            "critique": (
                f"Average pairwise correlation is {metrics['avg_corr']:.2f}. "
                f"Even diversified-looking portfolios can suffer simultaneous drawdowns during broad market stress."
            ),
        })

    return warnings[:4]


def devils_advocate_critique(allocations: list[dict], regime: str, metrics: dict) -> dict:
    api_key = os.getenv("GROQ_API_KEY", "")

    if api_key:
        t1, t2 = metrics["highest_corr_pair"]
        user_msg = (
            f"Portfolio regime: {regime}. "
            f"Top sector: {metrics['top_sector']} at {metrics['top_sector_weight']}% of portfolio. "
            f"Largest single holding: {metrics['top_holding_name']} ({metrics['top_holding_ticker']}) at {metrics['top_holding_weight']}%. "
            f"Highest correlated pair: {t1} & {t2} with correlation {metrics['highest_corr']:.3f} (1-year daily returns). "
            f"Average pairwise correlation: {metrics['avg_corr']:.3f}. "
            f"Number of holdings with >5% weight: {metrics['effective_count']}. "
            f"Cash buffer: {metrics['cash_weight']}%. "
            f"Regime mismatch detected: {metrics['regime_mismatch']}. "
            f"Sector weights breakdown: {json.dumps(metrics['sector_weights'])}."
        )
        try:
            with httpx.Client(timeout=25) as client:
                resp = client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "max_tokens": 600,
                        "messages": [
                            {
                                "role": "system",
                                "content": (
                                    "You are a skeptical, blunt risk analyst. Your ONLY job is to attack this portfolio "
                                    "and expose hidden risks. Be specific and cite the exact numbers given. "
                                    "Do not be reassuring. Do not invent data — only critique based on the metrics provided. "
                                    "Return exactly 3-4 risk warnings as a JSON array, each: "
                                    "{\"severity\": \"high\"|\"medium\"|\"low\", \"title\": string (short, 3-5 words), "
                                    "\"critique\": string (one sharp sentence citing a real number from the metrics)}. "
                                    "Return ONLY the JSON array, no markdown, no extra text."
                                ),
                            },
                            {"role": "user", "content": user_msg},
                        ],
                    },
                )
            data = resp.json()
            raw = data["choices"][0]["message"]["content"].strip()
            raw = raw.replace("```json", "").replace("```", "").strip()
            warnings = json.loads(raw)
            if isinstance(warnings, list) and len(warnings) > 0:
                return {
                    "warnings": warnings[:4],
                    "metrics": metrics,
                    "generated_at": datetime.utcnow().isoformat(),
                }
        except Exception as e:
            log.warning("Devil's Advocate LLM failed: %s", e)

    # deterministic fallback — still uses real numbers
    return {
        "warnings": _deterministic_warnings(metrics),
        "metrics": metrics,
        "generated_at": datetime.utcnow().isoformat(),
    }
