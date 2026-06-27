import math
import pandas as pd
import pandas_ta as ta


def _safe(val, default=0.0):
  if val is None or (isinstance(val, float) and math.isnan(val)):
    return default
  return val


def compute_indicators(df: pd.DataFrame) -> dict:
  close = df["Close"]
  close_last = float(close.iloc[-1])
  n = len(df)

  # --- RSI (14) ---
  rsi_series = ta.rsi(close, length=14)
  rsi_val = 50.0
  rsi_signal = "Neutral zone"
  if rsi_series is not None and not rsi_series.isna().all():
    rsi_val = float(rsi_series.iloc[-1])
    if rsi_val < 30:
      rsi_signal = "Oversold — potential buy opportunity"
    elif rsi_val > 70:
      rsi_signal = "Overbought — consider waiting for pullback"

  # --- MACD (12, 26, 9) ---
  macd_signal = "Insufficient data for MACD"
  macd_line = 0.0
  signal_line = 0.0
  macd = ta.macd(close, fast=12, slow=26, signal=9)
  if macd is not None and len(macd) >= 2:
    macd_line = float(macd["MACD_12_26_9"].iloc[-1])
    signal_line = float(macd["MACDs_12_26_9"].iloc[-1])
    macd_prev = float(macd["MACD_12_26_9"].iloc[-2])
    signal_prev = float(macd["MACDs_12_26_9"].iloc[-2])
    if not (math.isnan(macd_prev) or math.isnan(signal_prev)):
      if macd_prev < signal_prev and macd_line > signal_line:
        macd_signal = "Bullish crossover just detected — momentum turning up"
      elif macd_prev > signal_prev and macd_line < signal_line:
        macd_signal = "Bearish crossover — momentum weakening"
      elif macd_line > signal_line:
        macd_signal = "Above signal line — bullish momentum"
      else:
        macd_signal = "Below signal line — bearish momentum"
    else:
      macd_signal = "Neutral momentum"
  else:
    macd_signal = "Insufficient data for MACD"

  # --- Bollinger Bands (20, 2) ---
  bb_signal = "No signal"
  pct_b = 0.5
  bbands = ta.bbands(close, length=20, std=2)
  if bbands is not None:
    bb_cols = [c for c in bbands.columns if c.startswith("BBL_")]
    if not bb_cols:
      bb_lower = bb_upper = float("nan")
    else:
      bb_lower = float(bbands[bb_cols[0]].iloc[-1])
      bb_upper_col = [c for c in bbands.columns if c.startswith("BBU_")]
      bb_upper = float(bbands[bb_upper_col[0]].iloc[-1]) if bb_upper_col else float("nan")
    if not (math.isnan(bb_lower) or math.isnan(bb_upper) or bb_upper == bb_lower):
      pct_b = (close_last - bb_lower) / (bb_upper - bb_lower)
      if pct_b < 0.2:
        bb_signal = "Near lower band — potential bounce zone"
      elif pct_b > 0.8:
        bb_signal = "Near upper band — resistance zone"
      else:
        bb_signal = "Mid-band — no extreme signal"

  # --- Moving Averages ---
  ma20 = _safe(float(close.rolling(20).mean().iloc[-1]))
  ma50 = _safe(float(close.rolling(50).mean().iloc[-1])) if n >= 50 else close_last
  ma200 = _safe(float(close.rolling(200).mean().iloc[-1])) if n >= 200 else close_last
  trend = (
    "Uptrend (above 50-day MA)"
    if close_last > ma50 and n >= 50
    else "Downtrend (below 50-day MA)" if n >= 50
    else "Trend data insufficient"
  )
  cross = (
    "Golden cross active — long-term bullish"
    if ma50 > ma200 and n >= 50
    else "Death cross active — long-term bearish" if n >= 50
    else "Cross data insufficient"
  )

  # --- Volume ---
  vol_today = float(df["Volume"].iloc[-1])
  vol_avg = float(df["Volume"].tail(20).mean())
  vol_ratio = vol_today / vol_avg if vol_avg > 0 else 1.0
  if vol_ratio > 1.5:
    vol_signal = f"Volume spike {vol_ratio:.1f}x average — strong interest"
  elif vol_ratio < 0.5:
    vol_signal = "Low volume — weak conviction"
  else:
    vol_signal = "Normal volume"

  # --- Composite score ---
  bullish_count = 0
  total_buckets = 5
  if rsi_val < 30:
    bullish_count += 1
  if macd_line > signal_line:
    bullish_count += 1
  if pct_b < 0.2:
    bullish_count += 1
  if close_last > ma50:
    bullish_count += 1
  if vol_ratio > 1.0:
    bullish_count += 1

  return {
    "rsi_value": round(rsi_val, 1),
    "rsi_signal": rsi_signal,
    "macd_signal": macd_signal,
    "bb_signal": bb_signal,
    "bb_pct": round(float(pct_b), 2),
    "ma_trend": trend,
    "ma_cross": cross,
    "ma50": round(float(ma50), 2),
    "ma200": round(float(ma200), 2),
    "volume_signal": vol_signal,
    "volume_ratio": round(float(vol_ratio), 1),
    "composite_score": round(bullish_count / total_buckets, 2),
  }
