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
  api_key = os.getenv("XAI_API_KEY", "")
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
        "https://api.x.ai/v1/chat/completions",
        headers={
          "Authorization": f"Bearer {api_key}",
          "Content-Type": "application/json",
        },
        json={
          "model": "grok-2",
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


@app.post("/api/optimize-portfolio")
def optimize_portfolio(body: OptimizeRequest):
  try:
    prices = yf.download(body.tickers, period="1y", interval="1d", auto_adjust=True, progress=False)
    if isinstance(prices.columns, pd.MultiIndex):
      prices = prices.xs("Close", axis=1, level=0)
    else:
      prices = prices["Close"]

    prices = prices.dropna(axis=1, how="all").dropna(how="any")
    if prices.empty or prices.shape[1] < 2:
      raise ValueError("Not enough valid price data after cleaning")

    mu = expected_returns.mean_historical_return(prices)
    S = risk_models.sample_cov(prices)
    ef = EfficientFrontier(mu, S)

    if body.risk_level == "low":
      ef.min_volatility()
    elif body.risk_level == "high":
      ef.efficient_return(target_return=0.20)
    else:
      ef.max_sharpe()

    weights = ef.clean_weights()
    perf = ef.portfolio_performance(verbose=False)
    exp_return, vol, sharpe = perf

  except Exception as e:
    log.warning("Optimization failed, using equal weights: %s", e)
    n = len(body.tickers)
    weights = {t: 1.0 / n for t in body.tickers}
    exp_return, vol, sharpe = 0.08, 0.15, 0.5

  capital = body.capital
  allocations = []
  for ticker in body.tickers:
    w = weights.get(ticker, 0.0)
    weight_pct = round(w * 100, 2)
    amount = round(capital * w, 2)
    allocations.append({
      "ticker": ticker,
      "name": TICKER_TO_NAME.get(ticker, ticker),
      "weight_pct": weight_pct,
      "amount": amount,
    })

  return {
    "allocations": allocations,
    "expected_annual_return": round(float(exp_return) * 100, 2),
    "portfolio_volatility": round(float(vol) * 100, 2),
    "sharpe_ratio": round(float(sharpe), 3),
    "scenario": {
      "bull": round(capital * (1 + exp_return + vol), 2),
      "base": round(capital * (1 + exp_return), 2),
      "bear": round(capital * (1 + exp_return - 1.5 * vol), 2),
    },
  }


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
      "change_pct_1d": round(float(change_pct), 2) if change_pct is not None else None,
      "last_updated": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    _price_cache[t] = {"ts": now, "data": entry}
    results.append(entry)

  _price_cache.clear()

  return results


@app.get("/api/market-summary")
def market_summary():
    last_updated_str = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    tickers = ["^NSEI"] + MARKET_WATCHLIST
    
    try:
        df = yf.download(tickers, period="5d", auto_adjust=True, progress=False)
    except Exception as e:
        log.error("Bulk yfinance download failed: %s", e)
        df = pd.DataFrame()

    index_data = None
    if not df.empty and "^NSEI" in df["Close"]:
        try:
            nifty_close = df["Close"]["^NSEI"].dropna()
            if not nifty_close.empty:
                latest_close = nifty_close.iloc[-1]
                prev_close = nifty_close.iloc[-2] if len(nifty_close) > 1 else latest_close
                
                nifty_high = df["High"]["^NSEI"].dropna()
                nifty_low = df["Low"]["^NSEI"].dropna()
                nifty_vol = df["Volume"]["^NSEI"].dropna()
                
                index_data = {
                    "symbol": "NIFTY50",
                    "last_price": round(float(latest_close), 2),
                    "change": round(float(latest_close - prev_close), 2),
                    "change_percent": round(((float(latest_close) - prev_close) / prev_close) * 100, 2) if prev_close > 0 else 0.0,
                    "high": round(float(nifty_high.iloc[-1]), 2) if not nifty_high.empty else 0.0,
                    "low": round(float(nifty_low.iloc[-1]), 2) if not nifty_low.empty else 0.0,
                    "volume": int(nifty_vol.iloc[-1]) if not nifty_vol.empty else 0,
                }
        except Exception as e:
            log.warning("Failed to parse NIFTY50: %s", e)

    stocks = []
    if not df.empty:
        for ticker in MARKET_WATCHLIST:
            try:
                if ticker not in df["Close"]:
                    continue
                closes = df["Close"][ticker].dropna()
                if closes.empty:
                    continue
                
                latest_close = closes.iloc[-1]
                prev_close = closes.iloc[-2] if len(closes) > 1 else latest_close
                
                highs = df["High"][ticker].dropna()
                lows = df["Low"][ticker].dropna()
                vols = df["Volume"][ticker].dropna()
                
                change = latest_close - prev_close
                change_pct = (change / prev_close * 100) if prev_close > 0 else 0.0
                
                symbol = ticker.replace(".NS", "")
                name = TICKER_TO_NAME.get(ticker, symbol)
                sector = SECTOR_TO_NAME.get(ticker, "Unknown")
                
                stocks.append({
                    "symbol": symbol,
                    "ticker": ticker,
                    "name": name,
                    "sector": sector,
                    "last_price": round(float(latest_close), 2),
                    "change": round(float(change), 2),
                    "change_percent": round(float(change_pct), 2),
                    "high": round(float(highs.iloc[-1]), 2) if not highs.empty else 0.0,
                    "low": round(float(lows.iloc[-1]), 2) if not lows.empty else 0.0,
                    "volume": int(vols.iloc[-1]) if not vols.empty else 0,
                })
            except Exception as e:
                log.warning("Failed to parse %s: %s", ticker, e)

    sorted_stocks = sorted(stocks, key=lambda s: s["change_percent"], reverse=True)
    gainers = [s for s in sorted_stocks if s["change_percent"] > 0][:5]
    losers = [s for s in reversed(sorted_stocks) if s["change_percent"] < 0][:5]

    return {
        "index": index_data,
        "stocks": stocks,
        "gainers": gainers,
        "losers": losers,
        "last_updated": last_updated_str,
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
  api_key = os.getenv("XAI_API_KEY", "")

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
          "https://api.x.ai/v1/chat/completions",
          headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
          json={
            "model": "grok-2",
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

  return {"insights": insights, "generated_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")}
