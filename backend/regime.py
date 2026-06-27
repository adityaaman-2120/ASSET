import logging
from datetime import datetime

import numpy as np
import pandas as pd
import yfinance as yf
from sklearn.preprocessing import StandardScaler
from hmmlearn.hmm import GaussianHMM

log = logging.getLogger("quantinvest")

REGIME_ACTIONS = {
    "HIGH_VOLATILITY": "Markets are very shaky right now (high volatility). We're moving 30% of your money to cash and reducing risk across the portfolio.",
    "BULL":            "Markets are trending up (bullish momentum). We're investing fully to maximise your returns.",
    "BEAR":            "Markets are falling (bearish trend). We're holding 30% as cash and protecting what you have.",
    "SIDEWAYS":        "Markets are moving sideways (range-bound). We're keeping a balanced mix — steady and diversified.",
}

_SAFE_DEFAULT = {
    "regime": "SIDEWAYS",
    "confidence": 0.5,
    "mean_return_annualized": 0.0,
    "volatility_annualized": 0.15,
    "action": REGIME_ACTIONS["SIDEWAYS"],
    "as_of": datetime.utcnow().date().isoformat(),
}


def detect_regime(period: str = "2y") -> dict:
    try:
        df = yf.download("^NSEI", period=period, interval="1d", auto_adjust=True, progress=False)
        if df.empty:
            log.warning("Empty NIFTY50 data for regime detection")
            return _SAFE_DEFAULT

        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.droplevel(1)

        close = df["Close"].squeeze()
        log_ret = np.log(close / close.shift(1))
        roll_vol = log_ret.rolling(20).std()

        obs = pd.concat([log_ret, roll_vol], axis=1).dropna()
        obs.columns = ["ret", "vol"]
        X = obs.values

        # scale features so HMM covariance stays well-conditioned
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        # try multiple random seeds, keep the best-scoring model
        best_model, best_score = None, -np.inf
        for seed in range(10):
            m = GaussianHMM(n_components=4, covariance_type="full", n_iter=500, random_state=seed, tol=1e-4)
            m.fit(X_scaled)
            try:
                s = m.score(X_scaled)
                if s > best_score:
                    best_score, best_model = s, m
            except Exception:
                pass

        if best_model is None:
            raise ValueError("All HMM seeds failed to score")

        hidden_states = best_model.predict(X_scaled)
        proba = best_model.predict_proba(X_scaled)

        current_state = int(hidden_states[-1])
        confidence = float(proba[-1, current_state])

        # derive per-state stats on original (unscaled) values
        state_stats = {}
        for s in range(4):
            mask = hidden_states == s
            state_stats[s] = {
                "mean_ret": float(obs["ret"][mask].mean()),
                "mean_vol": float(obs["vol"][mask].mean()),
            }

        # label states by data-derived stats — no hardcoded index mapping
        by_vol = sorted(state_stats.keys(), key=lambda s: state_stats[s]["mean_vol"], reverse=True)
        high_vol_state = by_vol[0]
        remaining = by_vol[1:]
        bull_state = max(remaining, key=lambda s: state_stats[s]["mean_ret"])
        bear_state = min(remaining, key=lambda s: state_stats[s]["mean_ret"])
        sideways_state = [s for s in remaining if s != bull_state and s != bear_state][0]

        label_map = {
            high_vol_state: "HIGH_VOLATILITY",
            bull_state:     "BULL",
            bear_state:     "BEAR",
            sideways_state: "SIDEWAYS",
        }

        regime_label = label_map[current_state]
        cur_stats = state_stats[current_state]
        mean_ret_ann = float(cur_stats["mean_ret"] * 252)
        vol_ann = float(cur_stats["mean_vol"] * np.sqrt(252))

        log.info(
            "Regime detected: %s (state=%d, conf=%.2f, ret_ann=%.3f, vol_ann=%.3f)",
            regime_label, current_state, confidence, mean_ret_ann, vol_ann,
        )

        return {
            "regime": regime_label,
            "confidence": round(confidence, 4),
            "mean_return_annualized": round(mean_ret_ann, 4),
            "volatility_annualized": round(vol_ann, 4),
            "action": REGIME_ACTIONS[regime_label],
            "as_of": obs.index[-1].date().isoformat(),
        }

    except Exception as e:
        log.error("Regime detection failed: %s", e)
        return {**_SAFE_DEFAULT, "as_of": datetime.utcnow().date().isoformat()}
