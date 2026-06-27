import os
import json
import time
import logging
from datetime import datetime, timedelta

import joblib
import httpx
import pandas as pd
import yfinance as yf
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel
from pypfopt import EfficientFrontier, risk_models, expected_returns
from indicators import compute_indicators
from ml_model import predict_signal, FEATURE_KEYS
from regime import detect_regime
from stress_test import run_stress_test
from devils_advocate import analyze_portfolio_risks, devils_advocate_critique

load_dotenv()

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("quantinvest")

SECTOR_MAP = {
  "Technology": ["TCS.NS","INFY.NS","WIPRO.NS","HCLTECH.NS","TECHM.NS","LTI.NS"],
  "Banking and Finance": ["HDFCBANK.NS","ICICIBANK.NS","SBIN.NS","KOTAKBANK.NS","AXISBANK.NS","INDUSINDBK.NS"],
  "Pharmaceuticals": ["SUNPHARMA.NS","DRREDDY.NS","CIPLA.NS","DIVISLAB.NS","AUROPHARMA.NS"],
  "Energy and Oil": ["RELIANCE.NS","ONGC.NS","BPCL.NS","POWERGRID.NS","NTPC.NS"],
  "FMCG and Consumer": ["HINDUNILVR.NS","ITC.NS","NESTLEIND.NS","BRITANNIA.NS","DABUR.NS"],
  "EVs and Green Energy": ["TATAMOTORS.NS","TATAPOWER.NS","ADANIGREEN.NS","CESC.NS"],
  "Infrastructure": ["ADANIPORTS.NS","DLF.NS","ULTRACEMCO.NS","GRASIM.NS"],
  "Defence and PSUs": ["HAL.NS","BEL.NS","BHEL.NS","COALINDIA.NS"],
}

TICKER_TO_NAME = {
  "TCS.NS": "Tata Consultancy Services",
  "INFY.NS": "Infosys",
  "WIPRO.NS": "Wipro",
  "HCLTECH.NS": "HCL Technologies",
  "TECHM.NS": "Tech Mahindra",
  "LTI.NS": "LTI Mindtree",
  "HDFCBANK.NS": "HDFC Bank",
  "ICICIBANK.NS": "ICICI Bank",
  "SBIN.NS": "State Bank of India",
  "KOTAKBANK.NS": "Kotak Mahindra Bank",
  "AXISBANK.NS": "Axis Bank",
  "INDUSINDBK.NS": "IndusInd Bank",
  "SUNPHARMA.NS": "Sun Pharmaceutical",
  "DRREDDY.NS": "Dr. Reddy's Laboratories",
  "CIPLA.NS": "Cipla",
  "DIVISLAB.NS": "Divi's Laboratories",
  "AUROPHARMA.NS": "Aurobindo Pharma",
  "RELIANCE.NS": "Reliance Industries",
  "ONGC.NS": "Oil & Natural Gas Corporation",
  "BPCL.NS": "Bharat Petroleum",
  "POWERGRID.NS": "Power Grid Corporation",
  "NTPC.NS": "NTPC",
  "HINDUNILVR.NS": "Hindustan Unilever",
  "ITC.NS": "ITC",
  "NESTLEIND.NS": "Nestle India",
  "BRITANNIA.NS": "Britannia Industries",
  "DABUR.NS": "Dabur India",
  "TATAMOTORS.NS": "Tata Motors",
  "TATAPOWER.NS": "Tata Power",
  "ADANIGREEN.NS": "Adani Green Energy",
  "CESC.NS": "CESC",
  "ADANIPORTS.NS": "Adani Ports & SEZ",
  "DLF.NS": "DLF",
  "ULTRACEMCO.NS": "UltraTech Cement",
  "GRASIM.NS": "Grasim Industries",
  "HAL.NS": "Hindustan Aeronautics",
  "BEL.NS": "Bharat Electronics",
  "BHEL.NS": "BHEL",
  "COALINDIA.NS": "Coal India",
}

SECTOR_TO_NAME = {ticker: sector for sector, tickers in SECTOR_MAP.items() for ticker in tickers}

# NSE watchlist for live market summary (inspired by ASSET's NSE_WATCHLIST)
MARKET_WATCHLIST = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS",
    "ICICIBANK.NS", "HINDUNILVR.NS", "SBIN.NS", "ITC.NS",
    "KOTAKBANK.NS", "LT.NS", "AXISBANK.NS", "WIPRO.NS",
    "TITAN.NS", "BAJFINANCE.NS", "MARUTI.NS",
]

WATCHLIST_SYMBOL = {t.replace(".NS", ""): t for t in MARKET_WATCHLIST}

_cache = {}
_price_cache = {}

class FetchStocksRequest(BaseModel):
  sectors: list[str]
  period: str = "6mo"

class StockFeatures(BaseModel):
  rsi_14: float
  macd_diff: float
  bb_pct: float
  price_vs_50ma: float
  price_vs_200ma: float
  volume_ratio: float
  ret_7d: float
  ret_1d: float
  volatility_20d: float

class PredictStockItem(BaseModel):
  ticker: str
  features: StockFeatures

class PredictSignalsRequest(BaseModel):
  stocks: list[PredictStockItem]

class OptimizeRequest(BaseModel):
  tickers: list[str]
  capital: float
  risk_level: str = "medium"
  regime: str = "SIDEWAYS"

class InsightsPortfolioItem(BaseModel):
  ticker: str
  name: str
  signal: str = ""
  confidence: float = 0
  change_pct_1d: float = 0
  rsi_value: float = 50
  composite_score: float = 0
  weight_pct: float = 0

class GenerateInsightsRequest(BaseModel):
  portfolio: list[InsightsPortfolioItem]
  portfolio_value: float = 0
  invested_capital: float = 0

class StressTestRequest(BaseModel):
  allocations: list[dict]

class DevilsAdvocateRequest(BaseModel):
  allocations: list[dict]
  regime: str = "SIDEWAYS"

class WhatIfRequest(BaseModel):
  base_tickers: list[str]
  capital: float
  risk_level: str = "medium"
  regime: str = "SIDEWAYS"
  remove_tickers: list[str] = []
  add_tickers: list[str] = []
  extra_capital: float = 0

_model = None

app = FastAPI(title="QuantInvest API")

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_methods=["*"],
  allow_headers=["*"],
)

@app.get("/health")
def health():
  return { "status": "ok" }

@app.post("/api/fetch-stocks")
def fetch_stocks(body: FetchStocksRequest):
  cache_key = f"{sorted(body.sectors)}_{body.period}"
  now = datetime.utcnow()

  cached = _cache.get(cache_key)
  if cached and (now - cached["ts"]).total_seconds() < 600:
    return cached["data"]

  tickers = []
  for s in body.sectors:
    tickers.extend(SECTOR_MAP.get(s, []))
  tickers = list(dict.fromkeys(tickers))[:25]

  results = []
  errors = []

  for ticker in tickers:
    try:
      df = yf.download(ticker, period=body.period, interval="1d", auto_adjust=True, progress=False)
      if df.empty:
        log.warning("Empty DataFrame for %s", ticker)
        continue

      if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.droplevel(1)

      cp = float(df["Close"].iloc[-1])
      change_1d = float(((df["Close"].iloc[-1] - df["Close"].iloc[-2]) / df["Close"].iloc[-2]) * 100) if len(df) >= 2 else 0.0
      change_7d = float(((df["Close"].iloc[-1] - df["Close"].iloc[-8]) / df["Close"].iloc[-8]) * 100) if len(df) >= 8 else 0.0
      high_52w = float(df["High"].max())
      low_52w = float(df["Low"].min())
      avg_vol_20d = float(df["Volume"].tail(20).mean())
      closes = [float(x) for x in df["Close"].tail(60).tolist()]

      indicators = compute_indicators(df)

      name = TICKER_TO_NAME.get(ticker, ticker.replace(".NS", ""))
      sector = SECTOR_TO_NAME.get(ticker, "Unknown")

      results.append({
        "ticker": ticker,
        "name": name,
        "sector": sector,
        "current_price": round(cp, 2),
        "change_pct_1d": round(change_1d, 2),
        "change_pct_7d": round(change_7d, 2),
        "high_52w": round(high_52w, 2),
        "low_52w": round(low_52w, 2),
        "avg_volume_20d": round(avg_vol_20d, 0),
        "close_prices": closes,
        "indicators": indicators,
      })

      time.sleep(0.2)
    except Exception as e:
      log.error("Failed to fetch %s: %s", ticker, e)
      errors.append({"ticker": ticker, "error": str(e)})

  response = { "stocks": results, "errors": errors }
  _cache[cache_key] = { "ts": now, "data": response }
  return response


@app.on_event("startup")
def load_ml_model():
  global _model
  try:
    _model = joblib.load("stock_model.pkl")
    log.info("ML model loaded from stock_model.pkl")
  except Exception as e:
    log.warning("Could not load ML model: %s", e)
    _model = None


def _llm_reason(ticker: str, signal: str, confidence: float, feats: dict) -> str:
  api_key = os.getenv("GROQ_API_KEY", "")
  if not api_key:
    return _fallback_reason(feats)

  prompt = (
    f"Stock: {ticker}. Signal: {signal}. Confidence: {confidence:.0%}. "
    f"RSI: {feats['rsi_14']:.1f}. MACD diff: {feats['macd_diff']:.3f}. "
    f"Price vs 50MA: {feats['price_vs_50ma']:.1f}%. "
    f"Write ONE sentence explaining why this stock gets a {signal} signal for a retail investor. Be specific. No jargon."
  )

  try:
    with httpx.Client(timeout=15) as client:
      resp = client.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
          "Authorization": f"Bearer {api_key}",
          "Content-Type": "application/json",
        },
        json={
          "model": "llama-3.3-70b-versatile",
          "max_tokens": 100,
          "messages": [
            {"role": "system", "content": "You are a helpful financial advisor. Explain signals briefly for retail investors."},
            {"role": "user", "content": prompt},
          ],
        },
      )
    data = resp.json()
    return data["choices"][0]["message"]["content"].strip()
  except Exception as e:
    log.warning("LLM reason failed for %s: %s", ticker, e)
    return _fallback_reason(feats)


def _fallback_reason(feats: dict) -> str:
  rsi = feats.get("rsi_14", 50)
  return f"Signal based on RSI ({rsi:.0f}), momentum, and trend analysis."


@app.post("/api/predict-signals")
def predict_signals_endpoint(body: PredictSignalsRequest):
  if _model is None:
    return { "predictions": [], "error": "Model not loaded" }

  results = []
  for item in body.stocks:
    feats_dict = item.features.model_dump()
    pred = predict_signal(_model, feats_dict)
    reason = _llm_reason(
      item.ticker, pred["signal"], pred["confidence"], feats_dict
    )
    results.append({
      "ticker": item.ticker,
      "signal": pred["signal"],
      "confidence": pred["confidence"],
      "reason": reason,
      "features": feats_dict,
    })

  return { "predictions": results }


_REGIME_NOTES = {
  "HIGH_VOLATILITY": "Weights scaled to 70% equity; 30% held as cash buffer to limit drawdown.",
  "BEAR":            "Weights scaled to 70% equity; 30% held as cash buffer for capital preservation.",
  "BULL":            "Full equity deployment — maximising risk-adjusted return in a trending market.",
  "SIDEWAYS":        "Balanced allocation — standard Markowitz optimisation applied.",
}


def _run_optimization(tickers: list[str], capital: float, risk_level: str, regime: str = "SIDEWAYS") -> dict:
  """Core optimizer. Single source of truth used by both /api/optimize-portfolio and /api/what-if."""
  regime = (regime or "SIDEWAYS").upper()
  defensive = regime in ("HIGH_VOLATILITY", "BEAR")

  try:
    # 2-year lookback: more data = more stable mu/cov estimates
    prices = yf.download(tickers, period="2y", interval="1d", auto_adjust=True, progress=False)
    if isinstance(prices.columns, pd.MultiIndex):
      prices = prices.xs("Close", axis=1, level=0)
    else:
      prices = prices["Close"]

    prices = prices.dropna(axis=1, how="all").dropna(how="any")
    if prices.empty or prices.shape[1] < 2:
      raise ValueError("Not enough valid price data after cleaning")

    # EMA-weighted returns: recent data counts more, avoids 1-bad-year distortion
    mu = expected_returns.ema_historical_return(prices, span=500)
    # Ledoit-Wolf shrinkage: regularises covariance so small portfolios stay well-conditioned
    S = risk_models.CovarianceShrinkage(prices).ledoit_wolf()

    def _solve(objective: str) -> tuple:
      """Run one EfficientFrontier solve; return (weights, exp_return, vol, sharpe)."""
      ef = EfficientFrontier(mu, S)
      if objective == "min_vol":
        ef.min_volatility()
      elif objective == "max_quadratic":
        ef.max_quadratic_utility(risk_aversion=2)
      elif objective == "max_sharpe":
        ef.max_sharpe()
      elif objective == "efficient_return":
        ef.efficient_return(target_return=0.20)
      w = ef.clean_weights()
      r, v, sh = ef.portfolio_performance(verbose=False)
      return w, r, v, sh

    if defensive:
      weights, exp_return, vol, sharpe = _solve("min_vol")
      # min_volatility can produce negative expected return in a bear market;
      # fall back to a utility-balanced objective that still favours low risk
      # but won't recommend a portfolio expected to lose money
      if exp_return < 0:
        try:
          weights, exp_return, vol, sharpe = _solve("max_quadratic")
        except Exception:
          pass  # keep min_vol result if quadratic also fails
    elif risk_level == "low":
      weights, exp_return, vol, sharpe = _solve("min_vol")
    elif risk_level == "high":
      weights, exp_return, vol, sharpe = _solve("efficient_return")
    else:
      weights, exp_return, vol, sharpe = _solve("max_sharpe")

  except Exception as e:
    log.warning("Optimization failed, using equal weights: %s", e)
    n = len(tickers)
    weights = {t: 1.0 / n for t in tickers}
    exp_return, vol, sharpe = 0.08, 0.15, 0.5

  allocations = []

  if defensive:
    equity_capital = capital * 0.7
    for ticker in tickers:
      w = weights.get(ticker, 0.0)
      allocations.append({
        "ticker": ticker,
        "name": TICKER_TO_NAME.get(ticker, ticker),
        "weight_pct": round(w * 70, 2),
        "amount": round(equity_capital * w, 2),
      })
    allocations.append({
      "ticker": "CASH",
      "name": "Cash Reserve",
      "weight_pct": 30.0,
      "amount": round(capital * 0.3, 2),
    })
  else:
    for ticker in tickers:
      w = weights.get(ticker, 0.0)
      allocations.append({
        "ticker": ticker,
        "name": TICKER_TO_NAME.get(ticker, ticker),
        "weight_pct": round(w * 100, 2),
        "amount": round(capital * w, 2),
      })

  return {
    "allocations": allocations,
    "expected_annual_return": round(float(exp_return) * 100, 2),
    "portfolio_volatility": round(float(vol) * 100, 2),
    "sharpe_ratio": round(float(sharpe), 3),
    "regime_applied": regime,
    "regime_note": _REGIME_NOTES.get(regime, _REGIME_NOTES["SIDEWAYS"]),
    "scenario": {
      "bull": round(capital * (1 + exp_return + vol), 2),
      "base": round(capital * (1 + exp_return), 2),
      "bear": round(capital * (1 + exp_return - 1.5 * vol), 2),
    },
  }


@app.post("/api/optimize-portfolio")
def optimize_portfolio(body: OptimizeRequest):
  return _run_optimization(body.tickers, body.capital, body.risk_level, body.regime)


def _whatif_recommendation(before: dict, after: dict, new_capital: float, base_capital: float,
                            removed_tickers: list | None = None) -> str:
  dr = after["expected_annual_return"] - before["expected_annual_return"]
  dv = after["portfolio_volatility"]   - before["portfolio_volatility"]
  ds = after["sharpe_ratio"]           - before["sharpe_ratio"]
  dc = new_capital - base_capital

  b_proj = before.get("projected_value_1y", base_capital)
  a_proj = after.get("projected_value_1y",  new_capital)
  extra_gain = round(a_proj - b_proj, 2)

  metric_change = abs(dr) >= 0.1 or abs(dv) >= 0.1 or abs(ds) >= 0.01

  # capital-only case: percentages unchanged, but projected ₹ value scales
  if dc > 0 and not metric_change and not removed_tickers:
    return (
      f"Adding ₹{dc:,.0f} doesn't change your return or risk percentages — "
      f"those depend on asset allocation, not amount. "
      f"But it grows your projected 1-year value from ₹{b_proj:,.0f} to ₹{a_proj:,.0f}, "
      f"an extra ₹{extra_gain:,.0f} in real money. "
      f"The new capital is spread across the same optimised allocation."
    )

  # holding removed (with or without extra capital)
  if removed_tickers:
    removed_str = ", ".join(t.replace(".NS", "") for t in removed_tickers)
    risk_dir = "lower risk" if dv < -0.05 else ("higher risk" if dv > 0.05 else "similar risk")
    ret_dir  = "higher return" if dr > 0.1 else ("lower return" if dr < -0.1 else "similar return")
    verdict = (
      f"Removing {removed_str} re-optimised the portfolio to {ret_dir} "
      f"({before['expected_annual_return']:.1f}% → {after['expected_annual_return']:.1f}%) "
      f"and {risk_dir} "
      f"(vol {before['portfolio_volatility']:.1f}% → {after['portfolio_volatility']:.1f}%). "
      f"Sharpe {'improved' if ds > 0 else 'dropped'} "
      f"from {before['sharpe_ratio']:.2f} to {after['sharpe_ratio']:.2f}."
    )
    if dc > 0:
      verdict += (
        f" The extra ₹{dc:,.0f} lifts projected 1-year value to ₹{a_proj:,.0f} "
        f"(+₹{extra_gain:,.0f} vs. before)."
      )
    return verdict

  # generic: some metric changed
  parts = []
  if abs(dr) >= 0.1:
    parts.append(f"return {'rises' if dr > 0 else 'falls'} {abs(dr):.1f}%")
  if abs(dv) >= 0.1:
    parts.append(f"volatility {'rises' if dv > 0 else 'drops'} {abs(dv):.1f}%")
  if abs(ds) >= 0.01:
    parts.append(f"Sharpe {'improves' if ds > 0 else 'drops'} by {abs(ds):.2f}")
  if not parts:
    return "Minimal change — the optimizer converged to a very similar allocation."
  summary = "Portfolio re-optimised: " + ", ".join(parts) + "."
  if ds > 0 and dr > 0:
    return summary + " Overall improvement in risk-adjusted terms."
  if dv < 0:
    return summary + " Risk reduced — good defensive move."
  if ds < 0 and dv > 0:
    return summary + " More risk for less efficiency — reconsider the change."
  return summary


@app.post("/api/what-if")
def what_if(body: WhatIfRequest):
  regime = (body.regime or "SIDEWAYS").upper()

  # strip synthetic CASH entries — they are optimizer outputs, not inputs
  SYNTHETIC = {"CASH", "CASH RESERVE"}
  base_equity = [t for t in body.base_tickers if t.upper() not in SYNTHETIC]
  remove_set  = set(body.remove_tickers)
  modified    = list(dict.fromkeys(
    [t for t in base_equity if t not in remove_set] + body.add_tickers
  ))
  new_capital = body.capital + (body.extra_capital or 0)

  # cache keys
  base_key     = f"whatif_base_{'_'.join(sorted(base_equity))}_{body.capital}_{body.risk_level}_{regime}"
  modified_key = f"whatif_mod_{'_'.join(sorted(modified))}_{new_capital}_{body.risk_level}_{regime}"
  now = datetime.utcnow()
  TTL = 600

  def _cached_or_run(key, tickers, capital):
    cached = _cache.get(key)
    if cached and (now - cached["ts"]).total_seconds() < TTL:
      return cached["data"]
    result = _run_optimization(tickers, capital, body.risk_level, regime)
    _cache[key] = {"ts": now, "data": result}
    return result

  try:
    before_result = _cached_or_run(base_key,     base_equity, body.capital)
    after_result  = _cached_or_run(modified_key, modified,    new_capital)
  except Exception as e:
    log.error("What-if optimization failed: %s", e)
    return {"error": str(e)}

  def _projected(capital: float, annual_return_pct: float) -> float:
    return round(capital * (1 + annual_return_pct / 100), 2)

  before = {
    "expected_annual_return": before_result["expected_annual_return"],
    "portfolio_volatility":   before_result["portfolio_volatility"],
    "sharpe_ratio":           before_result["sharpe_ratio"],
    "capital":                body.capital,
    "projected_value_1y":     _projected(body.capital, before_result["expected_annual_return"]),
  }
  after = {
    "expected_annual_return": after_result["expected_annual_return"],
    "portfolio_volatility":   after_result["portfolio_volatility"],
    "sharpe_ratio":           after_result["sharpe_ratio"],
    "capital":                new_capital,
    "projected_value_1y":     _projected(new_capital, after_result["expected_annual_return"]),
    "allocations":            after_result["allocations"],
    "regime_note":            after_result.get("regime_note", ""),
  }
  extra_gain = round(after["projected_value_1y"] - before["projected_value_1y"], 2)
  delta = {
    "return_pct_change":     round(after["expected_annual_return"] - before["expected_annual_return"], 2),
    "volatility_pct_change": round(after["portfolio_volatility"]   - before["portfolio_volatility"],   2),
    "sharpe_change":         round(after["sharpe_ratio"]           - before["sharpe_ratio"],           3),
    "capital_change":        round(new_capital - body.capital, 2),
    "extra_projected_gain":  extra_gain,
  }
  return {
    "before":         before,
    "after":          after,
    "delta":          delta,
    "recommendation": _whatif_recommendation(
      before, after, new_capital, body.capital,
      removed_tickers=list(remove_set) if remove_set else None,
    ),
  }


@app.get("/api/detect-regime")
def detect_regime_endpoint():
  cache_key = "regime_detection"
  now = datetime.utcnow()
  cached = _cache.get(cache_key)
  if cached and (now - cached["ts"]).total_seconds() < 1800:
    return cached["data"]
  data = detect_regime()
  _cache[cache_key] = {"ts": now, "data": data}
  return data


@app.get("/api/live-prices")
def live_prices(tickers: str = ""):
  now = datetime.utcnow()
  ticker_list = [t.strip() for t in tickers.split(",") if t.strip()]
  results = []

  for t in ticker_list:
    cached = _price_cache.get(t)
    if cached and (now - cached["ts"]).total_seconds() < 60:
      results.append(cached["data"])
      continue

    try:
      tk = yf.Ticker(t)
      price = getattr(tk.fast_info, "last_price", None)
      prev_close = getattr(tk.fast_info, "previous_close", None)
      if price is not None and prev_close is not None and prev_close > 0:
        change_pct = (price - prev_close) / prev_close * 100
      else:
        price = None
        change_pct = None
    except Exception as e:
      log.warning("Live price failed for %s: %s", t, e)
      price = None
      change_pct = None

    entry = {
      "ticker": t,
      "current_price": round(float(price), 2) if price is not None else None,
      "prev_close": round(float(prev_close), 2) if prev_close is not None else None,
      "change_pct_1d": round(float(change_pct), 2) if change_pct is not None else None,
      "last_updated": now.isoformat(),
    }
    _price_cache[t] = {"ts": now, "data": entry}
    results.append(entry)

  _price_cache.clear()

  return results


@app.get("/api/market-summary")
def market_summary():
    now = datetime.utcnow()

    # Fetch NIFTY50 index
    index_data = None
    try:
        nifty = yf.Ticker("^NSEI")
        nhist = nifty.history(period="5d")
        if not nhist.empty:
            ilatest = nhist.iloc[-1]
            iprev = nhist.iloc[-2]["Close"] if len(nhist) > 1 else ilatest["Close"]
            index_data = {
                "symbol": "NIFTY50",
                "last_price": round(float(ilatest["Close"]), 2),
                "change": round(float(ilatest["Close"] - iprev), 2),
                "change_percent": round(((float(ilatest["Close"]) - iprev) / iprev) * 100, 2),
                "high": round(float(ilatest["High"]), 2),
                "low": round(float(ilatest["Low"]), 2),
                "volume": int(ilatest["Volume"]),
            }
    except Exception as e:
        log.warning("Failed to fetch NIFTY50: %s", e)

    # Fetch watchlist stocks
    stocks = []
    for ticker in MARKET_WATCHLIST:
        try:
            tk = yf.Ticker(ticker)
            info = tk.fast_info
            hist = tk.history(period="2d")
            if hist.empty:
                continue

            latest = hist.iloc[-1]
            prev_close = float(hist.iloc[-2]["Close"]) if len(hist) > 1 else float(latest["Close"])
            last_price = float(info.last_price) if hasattr(info, 'last_price') else float(latest["Close"])
            change = last_price - prev_close
            change_pct = (change / prev_close * 100) if prev_close > 0 else 0.0

            symbol = ticker.replace(".NS", "")
            name = TICKER_TO_NAME.get(ticker, symbol)
            sector = SECTOR_TO_NAME.get(ticker, "Unknown")

            stocks.append({
                "symbol": symbol,
                "ticker": ticker,
                "name": name,
                "sector": sector,
                "last_price": round(last_price, 2),
                "change": round(change, 2),
                "change_percent": round(change_pct, 2),
                "high": round(float(latest["High"]), 2),
                "low": round(float(latest["Low"]), 2),
                "volume": int(latest["Volume"]),
            })
        except Exception as e:
            log.warning("Failed to fetch %s: %s", ticker, e)

    # Top gainers and losers (inspired by ASSET's get_top_movers)
    sorted_stocks = sorted(stocks, key=lambda s: s["change_percent"], reverse=True)
    gainers = [s for s in sorted_stocks if s["change_percent"] > 0][:5]
    losers = [s for s in reversed(sorted_stocks) if s["change_percent"] < 0][:5]

    return {
        "index": index_data,
        "stocks": stocks,
        "gainers": gainers,
        "losers": losers,
        "last_updated": now.isoformat(),
    }


FALLBACK_INSIGHTS = [
  {"type": "tip", "stock": "Portfolio", "text": "Your portfolio is diversified across multiple sectors, which reduces concentration risk."},
  {"type": "positive", "stock": "Portfolio", "text": "Your Sharpe ratio suggests good risk-adjusted returns for your chosen strategy."},
  {"type": "tip", "stock": "Portfolio", "text": "Consider rebalancing quarterly to maintain your target allocation."},
  {"type": "negative", "stock": "Portfolio", "text": "Markets can be volatile in the short term — stay focused on your time horizon."},
  {"type": "positive", "stock": "Portfolio", "text": "Regular investments help you benefit from rupee-cost averaging over time."},
]


@app.post("/api/generate-insights")
def generate_insights(body: GenerateInsightsRequest):
  api_key = os.getenv("GROQ_API_KEY", "")

  if api_key:
    portfolio_data = [p.model_dump() for p in body.portfolio]
    pnl = body.portfolio_value - body.invested_capital
    prompt = (
      f"Portfolio: {json.dumps(portfolio_data)}. "
      f"Total value: ₹{body.portfolio_value}. Invested: ₹{body.invested_capital}. PnL: ₹{pnl}. "
      f"Generate 5 insights."
    )

    try:
      with httpx.Client(timeout=20) as client:
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
                  "You are a portfolio analyst AI. Generate exactly 5 insights as a JSON array. "
                  "Each insight: { type: 'warning'|'positive'|'negative'|'tip', stock: string, text: string "
                  "(one specific data-driven sentence for a retail investor) }. "
                  "Return ONLY the JSON array, no markdown, no extra text."
                ),
              },
              {"role": "user", "content": prompt},
            ],
          },
        )
      data = resp.json()
      raw = data["choices"][0]["message"]["content"].strip()
      raw = raw.replace("```json", "").replace("```", "").strip()
      insights = json.loads(raw)
    except Exception as e:
      log.warning("Insights LLM failed: %s", e)
      insights = FALLBACK_INSIGHTS
  else:
    insights = FALLBACK_INSIGHTS

  return {"insights": insights, "generated_at": datetime.utcnow().isoformat()}


@app.post("/api/devils-advocate")
def devils_advocate_endpoint(body: DevilsAdvocateRequest):
  regime = (body.regime or "SIDEWAYS").upper()
  tickers_key = ",".join(sorted(a.get("ticker","") for a in body.allocations if a.get("ticker","") != "CASH"))
  cache_key = f"devils_{tickers_key}_{regime}"
  now = datetime.utcnow()

  cached = _cache.get(cache_key)
  if cached and (now - cached["ts"]).total_seconds() < 900:
    return cached["data"]

  metrics = analyze_portfolio_risks(body.allocations, SECTOR_TO_NAME, regime)
  result  = devils_advocate_critique(body.allocations, regime, metrics)

  _cache[cache_key] = {"ts": now, "data": result}
  return result


@app.post("/api/stress-test")
def stress_test_endpoint(body: StressTestRequest):
  return run_stress_test(body.allocations)
