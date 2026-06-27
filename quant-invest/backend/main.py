import os
import time
import logging
from datetime import datetime, timedelta

import pandas as pd
import yfinance as yf
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel
from indicators import compute_indicators

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

_cache = {}

class FetchStocksRequest(BaseModel):
  sectors: list[str]
  period: str = "6mo"

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
