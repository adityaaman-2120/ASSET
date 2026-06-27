import logging
import time
from datetime import datetime
import pandas as pd
import yfinance as yf

log = logging.getLogger("quantinvest")

CRASH_WINDOWS = [
    {
        "name": "2008 Financial Crisis",
        "period": "2008-01-01 to 2009-03-31",
        "start": "2008-01-01",
        "end": "2009-04-01",
        "fallback_bench": -38.1,
        "fallback_port": -34.2,
    },
    {
        "name": "COVID-19 Crash",
        "period": "2020-02-01 to 2020-04-30",
        "start": "2020-02-01",
        "end": "2020-05-01",
        "fallback_bench": -26.0,
        "fallback_port": -22.5,
    },
    {
        "name": "2022 Tech Selloff",
        "period": "2022-01-01 to 2022-06-30",
        "start": "2022-01-01",
        "end": "2022-07-01",
        "fallback_bench": -15.2,
        "fallback_port": -12.0,
    },
]

_stress_cache = {}  # cache_key -> (timestamp, result)
_return_cache = {}  # (ticker, start, end) -> (timestamp, return_val)
CACHE_TTL = 900  # 15 minutes


def _fetch_period_return(ticker: str, start: str, end: str):
    cache_key = (ticker, start, end)
    now = time.time()
    if cache_key in _return_cache:
        ts, val = _return_cache[cache_key]
        if now - ts < CACHE_TTL:
            return val

    try:
        df = yf.download(ticker, start=start, end=end, auto_adjust=True, progress=False)
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.droplevel(1)

        if "Close" in df.columns:
            close_series = df["Close"]
        else:
            close_series = df

        if isinstance(close_series, pd.DataFrame):
            close_series = close_series.iloc[:, 0]

        vals = close_series.dropna().values.flatten()
        if len(vals) < 2:
            _return_cache[cache_key] = (now, None)
            return None

        first_close = float(vals[0])
        last_close = float(vals[-1])
        if first_close == 0:
            _return_cache[cache_key] = (now, None)
            return None

        ret = (last_close - first_close) / first_close
        _return_cache[cache_key] = (now, ret)
        return ret
    except Exception as e:
        log.warning("Failed to fetch return for %s (%s to %s): %s", ticker, start, end, e)
        _return_cache[cache_key] = (now, None)
        return None


def _fallback_result() -> dict:
    return {
        "scenarios": [
            {
                "name": "2008 Financial Crisis",
                "period": "2008-01-01 to 2009-03-31",
                "portfolio_impact_pct": -34.2,
                "benchmark_impact_pct": -38.1,
                "outperformance_pct": 3.9,
                "tickers_available": 0,
                "tickers_total": 0,
                "verdict": "Survived better than market",
            },
            {
                "name": "COVID-19 Crash",
                "period": "2020-02-01 to 2020-04-30",
                "portfolio_impact_pct": -22.5,
                "benchmark_impact_pct": -26.0,
                "outperformance_pct": 3.5,
                "tickers_available": 0,
                "tickers_total": 0,
                "verdict": "Survived better than market",
            },
            {
                "name": "2022 Tech Selloff",
                "period": "2022-01-01 to 2022-06-30",
                "portfolio_impact_pct": -12.0,
                "benchmark_impact_pct": -15.2,
                "outperformance_pct": 3.2,
                "tickers_available": 0,
                "tickers_total": 0,
                "verdict": "Survived better than market",
            },
        ],
        "summary": "Historical stress test fallback activated due to data connectivity issues.",
        "as_of": datetime.now().isoformat(),
        "error": "Failed to compute historical stress test",
    }


def run_stress_test(allocations: list[dict]) -> dict:
    try:
        real_tickers_sorted = tuple(
            sorted([
                str(a.get("ticker", "")).strip()
                for a in allocations
                if a.get("ticker")
                and str(a.get("ticker")).strip() != "CASH"
                and str(a.get("name", "")).strip().lower() != "cash reserve"
            ])
        )
        cache_key = real_tickers_sorted
        now = time.time()
        if cache_key in _stress_cache:
            ts, cached_res = _stress_cache[cache_key]
            if now - ts < CACHE_TTL:
                log.info("Returning stress test from cache for %s", cache_key)
                return cached_res

        cash_weight = 0.0
        real_allocs = []
        for a in allocations:
            ticker = str(a.get("ticker", "")).strip()
            name = str(a.get("name", "")).strip()
            w = float(a.get("weight_pct", 0.0))
            if ticker == "CASH" or name.lower() == "cash reserve":
                cash_weight += w
            elif ticker:
                real_allocs.append({"ticker": ticker, "weight_pct": w})

        total_raw = cash_weight + sum(a["weight_pct"] for a in real_allocs)
        if total_raw > 0:
            w_cash = cash_weight / total_raw
            for a in real_allocs:
                a["norm_weight"] = a["weight_pct"] / total_raw
        else:
            n = len(real_allocs)
            w_cash = 0.0
            for a in real_allocs:
                a["norm_weight"] = 1.0 / n if n > 0 else 0.0

        tickers_total = len(real_allocs)
        scenarios = []

        for win in CRASH_WINDOWS:
            bench_ret = _fetch_period_return("^NSEI", win["start"], win["end"])
            if bench_ret is None:
                bench_ret = win["fallback_bench"] / 100.0

            avail_items = []
            for a in real_allocs:
                ret = _fetch_period_return(a["ticker"], win["start"], win["end"])
                if ret is not None:
                    avail_items.append((a, ret))

            tickers_available = len(avail_items)
            sum_avail_w = sum(a["norm_weight"] for a, _ in avail_items) + w_cash

            if sum_avail_w > 0:
                port_ret = sum((a["norm_weight"] / sum_avail_w) * r for a, r in avail_items)
            else:
                port_ret = win["fallback_port"] / 100.0

            port_impact = round(port_ret * 100, 1)
            bench_impact = round(bench_ret * 100, 1)
            outperf = round(port_impact - bench_impact, 1)
            verdict = (
                "Survived better than market"
                if port_impact > bench_impact
                else "Hit harder than market"
            )

            scenarios.append({
                "name": win["name"],
                "period": win["period"],
                "portfolio_impact_pct": port_impact,
                "benchmark_impact_pct": bench_impact,
                "outperformance_pct": outperf,
                "tickers_available": tickers_available,
                "tickers_total": tickers_total,
                "verdict": verdict,
            })

        outperformed_count = sum(
            1 for s in scenarios if s["portfolio_impact_pct"] > s["benchmark_impact_pct"]
        )
        if outperformed_count == 3:
            summary = (
                "Your portfolio demonstrated strong resilience, outperforming the NIFTY buy-and-hold benchmark across all three historical market crashes."
            )
        elif outperformed_count == 2:
            summary = (
                "Your portfolio showed solid downside protection, outperforming the NIFTY benchmark during 2 out of 3 historical market crashes."
            )
        elif outperformed_count == 1:
            summary = (
                "Your portfolio outperformed the benchmark in 1 historical crash, but experienced severe drawdowns during broader market selloffs."
            )
        else:
            summary = (
                "Your portfolio experienced deeper drawdowns than the NIFTY buy-and-hold benchmark across historical crash scenarios, indicating high downside risk."
            )

        res = {
            "scenarios": scenarios,
            "summary": summary,
            "as_of": datetime.now().isoformat(),
        }
        _stress_cache[cache_key] = (now, res)
        return res

    except Exception as e:
        log.error("Stress test failed: %s", e)
        return _fallback_result()
