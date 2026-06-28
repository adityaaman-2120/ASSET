"""Quant engine for ASSETS.

Technical indicators, market-regime detection, XGBoost return prediction with
walk-forward validation, mean-variance/Kelly portfolio optimization, historical
stress testing, and TreeSHAP explanations.

All methods are synchronous CPU work; the API layer is expected to run them in a
worker thread (``asyncio.to_thread``). OHLCV input is a DataFrame with
``Open/High/Low/Close/Volume`` columns and a DatetimeIndex (as returned by
``MarketDataService.fetch_ohlcv``).
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import ta.momentum
import ta.trend
import ta.volatility
import xgboost as xgb
from scipy.optimize import minimize
from sklearn.model_selection import TimeSeriesSplit

TRADING_DAYS = 252
FORWARD_HORIZON = 21  # predict forward 21-day (~1 month) return
ROLLING_WINDOW = 252

# ML feature columns (engineered to be roughly stationary).
FEATURE_COLS = [
    "rsi_14",
    "macd_diff_norm",
    "bb_width",
    "bb_pct",
    "atr_pct",
    "price_to_sma_20",
    "price_to_sma_50",
    "price_to_sma_200",
    "price_to_ema_20",
    "price_to_ema_50",
    "price_to_ema_200",
    "volume_ratio",
    "ret_1d",
    "ret_5d",
    "ret_21d",
    "ret_63d",
    "lag_ret_1",
    "lag_ret_5",
    "lag_ret_21",
]

FEATURE_LABELS = {
    "rsi_14": "RSI (14)",
    "macd_diff_norm": "MACD histogram",
    "bb_width": "Bollinger band width",
    "bb_pct": "Position within Bollinger bands",
    "atr_pct": "Volatility (ATR %)",
    "price_to_sma_20": "Price vs 20-day SMA",
    "price_to_sma_50": "Price vs 50-day SMA",
    "price_to_sma_200": "Price vs 200-day SMA",
    "price_to_ema_20": "Price vs 20-day EMA",
    "price_to_ema_50": "Price vs 50-day EMA",
    "price_to_ema_200": "Price vs 200-day EMA",
    "volume_ratio": "Volume vs 20-day average",
    "ret_1d": "1-day return",
    "ret_5d": "5-day return",
    "ret_21d": "21-day return",
    "ret_63d": "63-day return",
    "lag_ret_1": "Return 1 day ago",
    "lag_ret_5": "Return 5 days ago",
    "lag_ret_21": "Return 21 days ago",
}

# Historical stress scenarios (inclusive date windows).
STRESS_SCENARIOS = {
    "2008_crash": ("2008-09-01", "2009-06-30"),
    "covid_2020": ("2020-02-01", "2020-08-31"),
    "2022_correction": ("2022-01-01", "2022-12-31"),
}


class QuantEngine:
    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #
    @staticmethod
    def _series(df: pd.DataFrame, name: str) -> pd.Series:
        """Case-insensitive column lookup returning a float Series."""
        if name in df.columns:
            return df[name].astype(float)
        for col in df.columns:
            if str(col).lower() == name.lower():
                return df[col].astype(float)
        raise KeyError(f"Column '{name}' not found in DataFrame.")

    # ------------------------------------------------------------------ #
    # 1. Indicators
    # ------------------------------------------------------------------ #
    def compute_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        out = df.copy()
        close = self._series(df, "Close")
        high = self._series(df, "High")
        low = self._series(df, "Low")
        volume = self._series(df, "Volume")

        out["rsi_14"] = ta.momentum.RSIIndicator(close, window=14).rsi()

        macd = ta.trend.MACD(close, window_slow=26, window_fast=12, window_sign=9)
        out["macd"] = macd.macd()
        out["macd_signal"] = macd.macd_signal()
        out["macd_diff"] = macd.macd_diff()

        bb = ta.volatility.BollingerBands(close, window=20, window_dev=2)
        out["bb_high"] = bb.bollinger_hband()
        out["bb_low"] = bb.bollinger_lband()
        out["bb_mid"] = bb.bollinger_mavg()
        out["bb_width"] = (out["bb_high"] - out["bb_low"]) / out["bb_mid"]

        out["atr_14"] = ta.volatility.AverageTrueRange(
            high, low, close, window=14
        ).average_true_range()

        for w in (20, 50, 200):
            out[f"sma_{w}"] = ta.trend.SMAIndicator(close, window=w).sma_indicator()
            out[f"ema_{w}"] = ta.trend.EMAIndicator(close, window=w).ema_indicator()

        out["volume_ratio"] = volume / volume.rolling(20).mean()

        for label, periods in (("ret_1d", 1), ("ret_5d", 5), ("ret_21d", 21), ("ret_63d", 63)):
            out[label] = close.pct_change(periods)

        return out

    def _build_features(self, df_ind: pd.DataFrame) -> pd.DataFrame:
        """Engineer the (roughly stationary) ML feature matrix."""
        close = self._series(df_ind, "Close")
        f = pd.DataFrame(index=df_ind.index)
        f["rsi_14"] = df_ind["rsi_14"]
        f["macd_diff_norm"] = df_ind["macd_diff"] / close
        f["bb_width"] = df_ind["bb_width"]
        band = (df_ind["bb_high"] - df_ind["bb_low"]).replace(0, np.nan)
        f["bb_pct"] = (close - df_ind["bb_low"]) / band
        f["atr_pct"] = df_ind["atr_14"] / close
        for w in (20, 50, 200):
            f[f"price_to_sma_{w}"] = close / df_ind[f"sma_{w}"] - 1
            f[f"price_to_ema_{w}"] = close / df_ind[f"ema_{w}"] - 1
        f["volume_ratio"] = df_ind["volume_ratio"]
        for c in ("ret_1d", "ret_5d", "ret_21d", "ret_63d"):
            f[c] = df_ind[c]
        f["lag_ret_1"] = df_ind["ret_1d"].shift(1)
        f["lag_ret_5"] = df_ind["ret_1d"].shift(5)
        f["lag_ret_21"] = df_ind["ret_1d"].shift(21)
        return f[FEATURE_COLS].replace([np.inf, -np.inf], np.nan)

    # ------------------------------------------------------------------ #
    # 2. Market regime
    # ------------------------------------------------------------------ #
    def detect_market_regime(self, df: pd.DataFrame) -> dict:
        ind = self.compute_indicators(df)
        close = self._series(df, "Close")
        if len(close.dropna()) < 60:
            return {"regime": "SIDEWAYS", "confidence": 0.3, "note": "insufficient history"}

        rsi = float(ind["rsi_14"].iloc[-1])
        bb_width = float(ind["bb_width"].iloc[-1])
        # "VIX proxy": annualised realised volatility over the last 21 days.
        realized_vol = float(ind["ret_1d"].rolling(21).std().iloc[-1] * np.sqrt(TRADING_DAYS))
        bb_width_med = float(ind["bb_width"].tail(126).median())

        price = float(close.iloc[-1])
        sma50 = float(ind["sma_50"].iloc[-1])
        sma200 = float(ind["sma_200"].iloc[-1]) if not np.isnan(ind["sma_200"].iloc[-1]) else sma50

        high_vol = realized_vol > 0.30 or (bb_width_med > 0 and bb_width > 2.0 * bb_width_med)
        bullish = price > sma50 and sma50 >= sma200 and rsi >= 55
        bearish = price < sma50 and sma50 <= sma200 and rsi <= 45

        if high_vol:
            regime = "HIGH_VOLATILITY"
            confidence = 0.5 + min(0.45, max(0.0, (realized_vol - 0.30) / 0.40))
        elif bullish:
            regime = "TRENDING_BULL"
            trend = (price / sma200 - 1) if sma200 else 0.0
            confidence = 0.5 + min(0.45, (rsi - 55) / 90 + max(0.0, trend))
        elif bearish:
            regime = "TRENDING_BEAR"
            trend = (1 - price / sma200) if sma200 else 0.0
            confidence = 0.5 + min(0.45, (45 - rsi) / 90 + max(0.0, trend))
        else:
            regime = "SIDEWAYS"
            confidence = 0.5 + min(0.4, (1.0 - abs(rsi - 50) / 50) * 0.4)

        return {
            "regime": regime,
            "confidence": round(float(np.clip(confidence, 0.0, 0.95)), 3),
            "signals": {
                "rsi": round(rsi, 2),
                "bb_width": round(bb_width, 4),
                "realized_vol_annual": round(realized_vol, 4),
                "price_vs_sma50": round(price / sma50 - 1, 4) if sma50 else None,
                "price_vs_sma200": round(price / sma200 - 1, 4) if sma200 else None,
            },
        }

    # ------------------------------------------------------------------ #
    # 3. Return prediction (XGBoost + walk-forward)
    # ------------------------------------------------------------------ #
    def predict_returns(
        self, ticker: str, df: pd.DataFrame, indicators: pd.DataFrame | None = None
    ) -> dict:
        if indicators is not None and "rsi_14" in indicators.columns:
            df_ind = indicators.copy()
            if "Close" not in df_ind.columns:
                df_ind["Close"] = self._series(df, "Close").reindex(df_ind.index)
        else:
            df_ind = self.compute_indicators(df)

        close = self._series(df_ind, "Close")
        daily_ret = close.pct_change().dropna()
        window_ret = daily_ret.iloc[-ROLLING_WINDOW:]
        vol_annual = float(window_ret.std() * np.sqrt(TRADING_DAYS)) if len(window_ret) > 1 else 0.0
        mdd = self._max_drawdown(window_ret)

        feats = self._build_features(df_ind)
        target = close.shift(-FORWARD_HORIZON) / close - 1

        valid_feat = feats.dropna()
        if valid_feat.empty:
            return self._prediction_fallback(ticker, window_ret, vol_annual, mdd)
        latest_feat = valid_feat.iloc[[-1]]

        y = target.reindex(feats.index)
        mask = feats.notna().all(axis=1) & y.notna()
        X_all = feats[mask].iloc[-ROLLING_WINDOW:]
        y_all = y[mask].iloc[-ROLLING_WINDOW:]
        n = len(X_all)

        if n < 60:
            return self._prediction_fallback(ticker, window_ret, vol_annual, mdd, latest_feat)

        # Walk-forward validation (5 folds).
        cv_dir, cv_pred, cv_true = [], [], []
        n_splits = min(5, max(2, n // 30))
        for tr_idx, va_idx in TimeSeriesSplit(n_splits=n_splits).split(X_all):
            model = self._make_model()
            model.fit(X_all.iloc[tr_idx], y_all.iloc[tr_idx])
            p = model.predict(X_all.iloc[va_idx])
            a = y_all.iloc[va_idx].to_numpy()
            cv_pred.extend(p.tolist())
            cv_true.extend(a.tolist())
            cv_dir.append(float(np.mean(np.sign(p) == np.sign(a))))

        cv_pred = np.array(cv_pred)
        cv_true = np.array(cv_true)
        dir_acc = float(np.mean(cv_dir)) if cv_dir else 0.5
        rmse = float(np.sqrt(np.mean((cv_pred - cv_true) ** 2))) if len(cv_pred) else np.nan
        baseline = float(np.std(cv_true)) if len(cv_true) else np.nan
        skill = float(np.clip(1 - rmse / baseline, 0.0, 1.0)) if baseline and baseline > 0 else 0.0
        confidence = float(np.clip(0.5 * dir_acc + 0.5 * skill, 0.05, 0.95))

        # Final model on the full window, predict the latest row.
        model = self._make_model()
        model.fit(X_all, y_all)
        predicted_return = float(np.clip(model.predict(latest_feat)[0], -0.6, 0.6))

        mu_annual = predicted_return * (TRADING_DAYS / FORWARD_HORIZON)
        sharpe = round(mu_annual / vol_annual, 3) if vol_annual > 1e-9 else 0.0

        return {
            "ticker": ticker,
            "predicted_return": round(predicted_return, 4),
            "confidence": round(confidence, 3),
            "sharpe_estimate": sharpe,
            "max_drawdown_estimate": round(mdd, 4),
            "volatility": round(vol_annual, 4),
            # carried along so generate_shap_explanation can be called downstream
            "model": model,
            "features": latest_feat,
            "feature_names": FEATURE_COLS,
            "n_train": n,
            "cv_directional_accuracy": round(dir_acc, 3),
        }

    @staticmethod
    def _make_model() -> xgb.XGBRegressor:
        return xgb.XGBRegressor(
            n_estimators=120,
            max_depth=3,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            reg_lambda=1.0,
            min_child_weight=3,
            objective="reg:squarederror",
            random_state=42,
            n_jobs=2,
        )

    @staticmethod
    def _max_drawdown(daily_ret: pd.Series) -> float:
        if daily_ret is None or len(daily_ret) < 2:
            return 0.0
        equity = (1 + daily_ret).cumprod()
        dd = equity / equity.cummax() - 1
        return float(dd.min())

    def _prediction_fallback(
        self, ticker, window_ret, vol_annual, mdd, latest_feat=None
    ) -> dict:
        pr = float(np.clip(window_ret.mean() * FORWARD_HORIZON, -0.6, 0.6)) if len(window_ret) else 0.0
        mu_annual = pr * (TRADING_DAYS / FORWARD_HORIZON)
        sharpe = round(mu_annual / vol_annual, 3) if vol_annual > 1e-9 else 0.0
        return {
            "ticker": ticker,
            "predicted_return": round(pr, 4),
            "confidence": 0.2,
            "sharpe_estimate": sharpe,
            "max_drawdown_estimate": round(mdd, 4),
            "volatility": round(vol_annual, 4),
            "model": None,
            "features": latest_feat,
            "feature_names": FEATURE_COLS,
            "n_train": 0,
            "note": "insufficient data; momentum fallback used",
        }

    # ------------------------------------------------------------------ #
    # 4. Portfolio optimization
    # ------------------------------------------------------------------ #
    def optimize_portfolio(
        self, tickers: list[str], predictions: dict, constraints: dict | None = None
    ) -> dict:
        constraints = constraints or {}
        max_weight = float(constraints.get("max_weight", 0.15))
        rf = float(constraints.get("risk_free_rate", 0.0))
        rho = float(constraints.get("avg_correlation", 0.3))
        excluded = {s.lower() for s in constraints.get("excluded_sectors", [])}

        # Filter to tickers we have predictions for and that aren't excluded.
        included: list[str] = []
        for t in tickers:
            p = predictions.get(t)
            if not p:
                continue
            sector = (p.get("sector") or "").lower()
            if sector and sector in excluded:
                continue
            included.append(t)

        if not included:
            return {"weights": {}, "expected_return": 0.0, "volatility": 0.0, "sharpe": 0.0,
                    "note": "no eligible tickers after exclusions"}

        n = len(included)
        mu = np.array([predictions[t]["predicted_return"] * (TRADING_DAYS / FORWARD_HORIZON)
                       for t in included])
        vols = np.array([self._asset_vol(predictions[t]) for t in included])
        Sigma = self._covariance(included, vols, rho, constraints)

        # Kelly position sizing: full-Kelly vector f = Σ⁻¹ μ, long-only normalised.
        kelly_raw = np.linalg.pinv(Sigma) @ mu
        kelly_long = np.clip(kelly_raw, 0, None)
        w_kelly = kelly_long / kelly_long.sum() if kelly_long.sum() > 0 else np.full(n, 1 / n)

        # Per-asset upper bound scaled by Kelly conviction (capped at max_weight).
        if w_kelly.max() > 0:
            kelly_cap = (w_kelly / w_kelly.max()) * max_weight
        else:
            kelly_cap = np.full(n, max_weight)
        kelly_cap = np.maximum(kelly_cap, min(max_weight, 0.02))
        upper = np.minimum(max_weight, kelly_cap)
        # Keep the simplex feasible. If Kelly caps are too tight, fall back to
        # max_weight; if even that can't sum to 1 (too few names for the cap),
        # raise the floor to equal-weight so concentration stays bounded at 1/n
        # rather than collapsing the cap entirely.
        if upper.sum() < 1.0:
            upper = np.full(n, max_weight)
        if upper.sum() < 1.0:
            upper = np.maximum(upper, 1.0 / n)
        bounds = [(0.0, float(u)) for u in upper]

        w_prev = np.array([constraints.get("current_weights", {}).get(t, 0.0) for t in included])
        lam_turnover = float(constraints.get("turnover_penalty", 0.0))

        def neg_sharpe(w: np.ndarray) -> float:
            ret = float(w @ mu)
            var = float(w @ Sigma @ w)
            vol = np.sqrt(max(var, 1e-12))
            sharpe = (ret - rf) / vol
            penalty = lam_turnover * float(np.sum(np.abs(w - w_prev)))
            return -sharpe + penalty

        x0 = np.clip(w_kelly, 0, upper)
        x0 = x0 / x0.sum() if x0.sum() > 0 else np.full(n, 1 / n)
        result = minimize(
            neg_sharpe, x0, method="SLSQP", bounds=bounds,
            constraints=[{"type": "eq", "fun": lambda w: np.sum(w) - 1.0}],
            options={"maxiter": 500, "ftol": 1e-9},
        )

        w = np.clip(result.x, 0, None)
        w = w / w.sum() if w.sum() > 0 else np.full(n, 1 / n)

        exp_ret = float(w @ mu)
        vol = float(np.sqrt(max(w @ Sigma @ w, 1e-12)))
        sharpe = (exp_ret - rf) / vol if vol > 1e-9 else 0.0

        weights = {t: round(float(wi), 4) for t, wi in zip(included, w) if wi > 1e-3}
        return {
            "weights": weights,
            "expected_return": round(exp_ret, 4),
            "volatility": round(vol, 4),
            "sharpe": round(sharpe, 3),
            "kelly_weights": {t: round(float(k), 4) for t, k in zip(included, w_kelly)},
            "converged": bool(result.success),
        }

    @staticmethod
    def _asset_vol(pred: dict) -> float:
        vol = pred.get("volatility")
        if vol is None:
            mu_annual = pred.get("predicted_return", 0.0) * (TRADING_DAYS / FORWARD_HORIZON)
            sharpe = pred.get("sharpe_estimate")
            vol = abs(mu_annual / sharpe) if sharpe else 0.25
        return float(np.clip(vol, 0.05, 1.5))

    @staticmethod
    def _covariance(included, vols, rho, constraints) -> np.ndarray:
        n = len(included)
        provided = constraints.get("cov_matrix")
        if provided:
            Sigma = np.array([[float(provided.get(a, {}).get(b, 0.0)) for b in included]
                              for a in included])
        else:
            Sigma = rho * np.outer(vols, vols)
            np.fill_diagonal(Sigma, vols ** 2)
        Sigma = 0.5 * (Sigma + Sigma.T)  # symmetrise
        Sigma += np.eye(n) * 1e-6  # ridge for numerical stability
        return Sigma

    # ------------------------------------------------------------------ #
    # 5. Stress testing
    # ------------------------------------------------------------------ #
    def stress_test(self, weights: dict, historical_data: dict) -> dict:
        results: dict = {}
        for name, (start, end) in STRESS_SCENARIOS.items():
            results[name] = self._run_scenario(weights, historical_data, start, end)

        tested = [v for v in results.values() if v.get("available")]
        results["summary"] = {
            "scenarios_available": len(tested),
            "worst_drawdown": round(min((v["max_drawdown"] for v in tested), default=0.0), 4),
            "worst_scenario": min(tested, key=lambda v: v["max_drawdown"]).get("scenario")
            if tested else None,
        }
        return results

    def _run_scenario(self, weights, historical_data, start, end) -> dict:
        start_ts, end_ts = pd.Timestamp(start), pd.Timestamp(end)
        series: dict[str, pd.Series] = {}
        for t, w in weights.items():
            if w <= 0:
                continue
            close = self._extract_close(historical_data.get(t))
            if close is None or close.empty:
                continue
            idx = pd.to_datetime(close.index)
            if getattr(idx, "tz", None) is not None:
                idx = idx.tz_localize(None)
            close = pd.Series(close.to_numpy(), index=idx)
            win = close[(close.index >= start_ts) & (close.index <= end_ts)]
            if len(win) < 5:
                continue
            series[t] = win.pct_change().dropna()

        if not series:
            return {"scenario": start[:4], "available": False, "reason": "no data in window"}

        rets = pd.DataFrame(series).fillna(0.0)
        ws = np.array([weights[t] for t in rets.columns], dtype=float)
        ws = ws / ws.sum()
        port = rets.to_numpy() @ ws
        equity = np.cumprod(1 + port)

        peak = np.maximum.accumulate(equity)
        dd = equity / peak - 1
        mdd = float(dd.min())
        trough = int(dd.argmin())
        peak_val = float(peak[trough])

        recovery_days, recovered = None, False
        for i in range(trough, len(equity)):
            if equity[i] >= peak_val:
                recovery_days, recovered = i - trough, True
                break
        if not recovered:  # estimate from post-trough average drift
            post = port[trough:]
            avg = float(post.mean()) if len(post) else 0.0
            gap = peak_val / equity[-1] - 1
            recovery_days = int(min(gap / avg, 2000)) if avg > 1e-5 else None

        return {
            "scenario": start[:4],
            "available": True,
            "max_drawdown": round(mdd, 4),
            "recovery_days": recovery_days,
            "recovered_within_window": recovered,
            "final_return": round(float(equity[-1] - 1), 4),
            "trading_days": len(equity),
            "tickers_used": list(rets.columns),
        }

    @staticmethod
    def _extract_close(data) -> pd.Series | None:
        if data is None:
            return None
        if isinstance(data, pd.Series):
            return data.astype(float)
        if isinstance(data, pd.DataFrame):
            for name in ("Close", "close", "Adj Close"):
                if name in data.columns:
                    return data[name].astype(float)
        return None

    # ------------------------------------------------------------------ #
    # 6. SHAP explanation (XGBoost TreeSHAP, no `shap` dependency)
    # ------------------------------------------------------------------ #
    def generate_shap_explanation(self, model, features, ticker: str, top_n: int = 5) -> dict:
        if model is None or features is None:
            return {"ticker": ticker, "top_factors": [], "note": "no model available"}

        booster = model.get_booster() if hasattr(model, "get_booster") else model

        if isinstance(features, pd.Series):
            features = features.to_frame().T
        if isinstance(features, pd.DataFrame):
            feat_row = features.iloc[[0]]
            names = list(feat_row.columns)
            dmatrix = xgb.DMatrix(feat_row, feature_names=names)
        else:  # ndarray
            names = list(booster.feature_names or FEATURE_COLS)
            dmatrix = xgb.DMatrix(np.asarray(features).reshape(1, -1), feature_names=names)

        contribs = booster.predict(dmatrix, pred_contribs=True)[0]
        bias = float(contribs[-1])
        values = contribs[:-1]

        ranked = sorted(zip(names, values), key=lambda kv: abs(kv[1]), reverse=True)
        top_factors = [
            {
                "factor": FEATURE_LABELS.get(name, name),
                "feature": name,
                "impact": round(float(val), 5),
                "direction": "positive" if val >= 0 else "negative",
            }
            for name, val in ranked[:top_n]
        ]

        return {
            "ticker": ticker,
            "base_value": round(bias, 5),
            "predicted_value": round(bias + float(np.sum(values)), 5),
            "top_factors": top_factors,
        }


# Module-level singleton for the API/orchestration layer.
quant_engine = QuantEngine()
