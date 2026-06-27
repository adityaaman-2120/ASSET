import pandas as pd
import numpy as np
import pandas_ta as ta
import yfinance as yf
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from xgboost import XGBClassifier


def _bb_col(bbands, prefix):
  cols = [c for c in bbands.columns if c.startswith(prefix)]
  return cols[0] if cols else None


FEATURE_KEYS = [
  "rsi_14", "macd_diff", "bb_pct", "price_vs_50ma",
  "price_vs_200ma", "volume_ratio", "ret_7d", "ret_1d", "volatility_20d",
]


def build_features(df: pd.DataFrame) -> pd.DataFrame:
  c = df["Close"]
  out = df[[]].copy()

  rsi = ta.rsi(c, length=14)
  if rsi is not None:
    out["rsi_14"] = rsi
  else:
    out["rsi_14"] = float("nan")

  macd = ta.macd(c, fast=12, slow=26, signal=9)
  if macd is not None:
    out["macd_diff"] = macd.iloc[:, 0] - macd.iloc[:, 2]
  else:
    out["macd_diff"] = float("nan")

  bbands = ta.bbands(c, length=20, std=2)
  if bbands is not None:
    lower_col = _bb_col(bbands, "BBL_")
    upper_col = _bb_col(bbands, "BBU_")
    if lower_col and upper_col:
      out["bb_pct"] = (c - bbands[lower_col]) / (bbands[upper_col] - bbands[lower_col])
    else:
      out["bb_pct"] = float("nan")
  else:
    out["bb_pct"] = float("nan")

  ma50 = c.rolling(50).mean()
  ma200 = c.rolling(200).mean()
  out["price_vs_50ma"] = (c - ma50) / ma50 * 100
  out["price_vs_200ma"] = (c - ma200) / ma200 * 100

  vol_avg_20 = df["Volume"].rolling(20).mean()
  out["volume_ratio"] = df["Volume"] / vol_avg_20

  out["ret_7d"] = c.pct_change(7) * 100
  out["ret_1d"] = c.pct_change(1) * 100
  out["volatility_20d"] = c.pct_change().rolling(20).std() * 100

  return out


def label_signals(df: pd.DataFrame) -> pd.Series:
  c = df["Close"]
  fwd_ret = c.shift(-10) / c - 1
  # per-ticker quantile cutoffs: guarantees ~1/3 each class for this ticker
  # fixed ±5% threshold collapses to all-HOLD in flat/bear markets
  valid = fwd_ret.dropna()
  low_cut  = float(valid.quantile(0.33))
  high_cut = float(valid.quantile(0.67))
  labels = pd.Series(1, index=df.index, dtype=int)
  labels[fwd_ret >= high_cut] = 2   # BUY: top third of forward returns
  labels[fwd_ret <= low_cut]  = 0   # SELL: bottom third
  return labels


def train_model():
  tickers = ["TCS.NS", "HDFCBANK.NS", "RELIANCE.NS", "SUNPHARMA.NS", "INFY.NS",
             "WIPRO.NS", "ICICIBANK.NS", "KOTAKBANK.NS", "AXISBANK.NS", "BAJFINANCE.NS"]
  all_X = []

  for t in tickers:
    print(f"Downloading {t}...")
    df = yf.download(t, period="3y", interval="1d", auto_adjust=True, progress=False)
    if df.empty:
      print(f"  Skipping {t} — no data")
      continue
    if isinstance(df.columns, pd.MultiIndex):
      df.columns = df.columns.droplevel(1)

    # drop last 10 rows: fwd_ret is NaN there (no 10-day future exists)
    df = df.iloc[:-10]

    feats = build_features(df)
    labels = label_signals(df)

    ticker_X = feats.copy()
    ticker_X["_label"] = labels
    ticker_X["_ticker"] = t
    all_X.append(ticker_X)

  combined = pd.concat(all_X)
  combined = combined.apply(pd.to_numeric, errors="coerce")
  combined = combined.dropna(subset=FEATURE_KEYS + ["_label"])

  X = combined[FEATURE_KEYS].values
  y = combined["_label"].values.astype(int)

  print(f"\nTotal samples: {len(combined)}")
  print(f"Class distribution (0=SELL, 1=HOLD, 2=BUY):\n{pd.Series(y).value_counts().sort_index()}")
  assert len(set(y)) == 3, f"Expected 3 classes, got: {set(y)}"

  X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
  )

  # compute per-sample weights so minority classes (BUY/SELL) aren't drowned out
  from sklearn.utils.class_weight import compute_sample_weight
  sample_weights = compute_sample_weight("balanced", y_train)

  model = XGBClassifier(
    n_estimators=200,
    max_depth=4,
    learning_rate=0.05,
    objective="multi:softprob",
    num_class=3,
    eval_metric="mlogloss",
    random_state=42,
    subsample=0.8,
    colsample_bytree=0.8,
  )
  model.fit(X_train, y_train, sample_weight=sample_weights)

  y_pred = model.predict(X_test)
  acc = accuracy_score(y_test, y_pred)
  print(f"Test accuracy: {acc:.4f}")
  dist = pd.Series(y_pred).map({0: "SELL", 1: "HOLD", 2: "BUY"}).value_counts()
  print(f"Prediction distribution on test set:\n{dist}")

  joblib.dump(model, "stock_model.pkl")
  print("Model saved to stock_model.pkl")

  return model


def predict_signal(model, features_dict: dict) -> dict:
  row = [features_dict[k] for k in FEATURE_KEYS]
  probs = model.predict_proba([row])[0]
  label_idx = int(model.predict([row])[0])
  label_map = {0: "SELL", 1: "HOLD", 2: "BUY"}
  return {
    "signal": label_map[label_idx],
    "confidence": round(float(max(probs)), 4),
    "label_idx": label_idx,
  }


if __name__ == "__main__":
  train_model()
