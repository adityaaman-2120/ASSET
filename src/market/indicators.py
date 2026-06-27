"""
Technical Indicators Module

Computes various technical indicators for trading signal generation.
Uses the 'ta' library for standard indicators with custom extensions.
"""

import logging
from dataclasses import dataclass
from enum import Enum
from typing import Any

import numpy as np
import pandas as pd
import ta
from ta.momentum import RSIIndicator, StochasticOscillator
from ta.trend import MACD, EMAIndicator, SMAIndicator, ADXIndicator
from ta.volatility import AverageTrueRange, BollingerBands
from ta.volume import VolumeWeightedAveragePrice

logger = logging.getLogger(__name__)


class Timeframe(Enum):
    """Candle timeframes."""
    M1 = "1m"
    M5 = "5m"
    M15 = "15m"
    M30 = "30m"
    H1 = "1h"
    H4 = "4h"
    D1 = "1d"


@dataclass
class IndicatorConfig:
    """Configuration for indicator calculation."""
    
    # Moving Averages
    sma_periods: list[int] = None
    ema_periods: list[int] = None
    
    # Momentum
    rsi_period: int = 14
    stoch_k_period: int = 14
    stoch_d_period: int = 3
    
    # Trend
    macd_fast: int = 12
    macd_slow: int = 26
    macd_signal: int = 9
    adx_period: int = 14
    
    # Volatility
    atr_period: int = 14
    bb_period: int = 20
    bb_std: int = 2
    
    def __post_init__(self):
        if self.sma_periods is None:
            self.sma_periods = [20, 50, 200]
        if self.ema_periods is None:
            self.ema_periods = [9, 21, 55]


@dataclass
class IndicatorResult:
    """Result of indicator calculations for a symbol."""
    
    symbol: str
    timeframe: Timeframe
    
    # Price data
    open: float
    high: float
    low: float
    close: float
    volume: int
    
    # Moving Averages
    sma: dict[int, float] = None  # period -> value
    ema: dict[int, float] = None
    
    # Momentum
    rsi: float = None
    stoch_k: float = None
    stoch_d: float = None
    
    # Trend
    macd: float = None
    macd_signal: float = None
    macd_histogram: float = None
    adx: float = None
    plus_di: float = None
    minus_di: float = None
    
    # Volatility
    atr: float = None
    bb_upper: float = None
    bb_middle: float = None
    bb_lower: float = None
    bb_percent: float = None
    
    # VWAP
    vwap: float = None
    
    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "symbol": self.symbol,
            "timeframe": self.timeframe.value,
            "price": {
                "open": self.open,
                "high": self.high,
                "low": self.low,
                "close": self.close,
                "volume": self.volume,
            },
            "moving_averages": {
                "sma": self.sma,
                "ema": self.ema,
            },
            "momentum": {
                "rsi": self.rsi,
                "stoch_k": self.stoch_k,
                "stoch_d": self.stoch_d,
            },
            "trend": {
                "macd": self.macd,
                "macd_signal": self.macd_signal,
                "macd_histogram": self.macd_histogram,
                "adx": self.adx,
                "plus_di": self.plus_di,
                "minus_di": self.minus_di,
            },
            "volatility": {
                "atr": self.atr,
                "bb_upper": self.bb_upper,
                "bb_middle": self.bb_middle,
                "bb_lower": self.bb_lower,
                "bb_percent": self.bb_percent,
            },
            "vwap": self.vwap,
        }


def calculate_indicators(
    df: pd.DataFrame,
    symbol: str,
    timeframe: Timeframe = Timeframe.M5,
    config: IndicatorConfig | None = None,
) -> IndicatorResult:
    """
    Calculate all technical indicators for a symbol.
    
    Args:
        df: DataFrame with columns: open, high, low, close, volume
        symbol: Trading symbol
        timeframe: Candle timeframe
        config: Indicator configuration (uses defaults if None)
    
    Returns:
        IndicatorResult with all calculated indicators
    """
    if config is None:
        config = IndicatorConfig()
    
    # Ensure required columns exist
    required_cols = ["open", "high", "low", "close", "volume"]
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Missing required column: {col}")
    
    # Get latest values
    latest = df.iloc[-1]
    
    # Calculate Moving Averages
    sma_values = {}
    for period in config.sma_periods:
        if len(df) >= period:
            sma = SMAIndicator(df["close"], window=period)
            sma_values[period] = float(sma.sma_indicator().iloc[-1])
    
    ema_values = {}
    for period in config.ema_periods:
        if len(df) >= period:
            ema = EMAIndicator(df["close"], window=period)
            ema_values[period] = float(ema.ema_indicator().iloc[-1])
    
    # Calculate RSI
    rsi = None
    if len(df) >= config.rsi_period:
        rsi_indicator = RSIIndicator(df["close"], window=config.rsi_period)
        rsi = float(rsi_indicator.rsi().iloc[-1])
    
    # Calculate Stochastic
    stoch_k, stoch_d = None, None
    if len(df) >= config.stoch_k_period:
        stoch = StochasticOscillator(
            df["high"], df["low"], df["close"],
            window=config.stoch_k_period,
            smooth_window=config.stoch_d_period,
        )
        stoch_k = float(stoch.stoch().iloc[-1])
        stoch_d = float(stoch.stoch_signal().iloc[-1])
    
    # Calculate MACD
    macd_val, macd_signal_val, macd_hist = None, None, None
    if len(df) >= config.macd_slow:
        macd = MACD(
            df["close"],
            window_fast=config.macd_fast,
            window_slow=config.macd_slow,
            window_sign=config.macd_signal,
        )
        macd_val = float(macd.macd().iloc[-1])
        macd_signal_val = float(macd.macd_signal().iloc[-1])
        macd_hist = float(macd.macd_diff().iloc[-1])
    
    # Calculate ADX
    adx_val, plus_di, minus_di = None, None, None
    if len(df) >= config.adx_period:
        adx = ADXIndicator(
            df["high"], df["low"], df["close"],
            window=config.adx_period,
        )
        adx_val = float(adx.adx().iloc[-1])
        plus_di = float(adx.adx_pos().iloc[-1])
        minus_di = float(adx.adx_neg().iloc[-1])
    
    # Calculate ATR
    atr = None
    if len(df) >= config.atr_period:
        atr_indicator = AverageTrueRange(
            df["high"], df["low"], df["close"],
            window=config.atr_period,
        )
        atr = float(atr_indicator.average_true_range().iloc[-1])
    
    # Calculate Bollinger Bands
    bb_upper, bb_middle, bb_lower, bb_percent = None, None, None, None
    if len(df) >= config.bb_period:
        bb = BollingerBands(
            df["close"],
            window=config.bb_period,
            window_dev=config.bb_std,
        )
        bb_upper = float(bb.bollinger_hband().iloc[-1])
        bb_middle = float(bb.bollinger_mavg().iloc[-1])
        bb_lower = float(bb.bollinger_lband().iloc[-1])
        bb_percent = float(bb.bollinger_pband().iloc[-1])
    
    # Calculate VWAP
    vwap = None
    if len(df) >= 1:
        vwap_indicator = VolumeWeightedAveragePrice(
            df["high"], df["low"], df["close"], df["volume"],
        )
        vwap = float(vwap_indicator.volume_weighted_average_price().iloc[-1])
    
    return IndicatorResult(
        symbol=symbol,
        timeframe=timeframe,
        open=float(latest["open"]),
        high=float(latest["high"]),
        low=float(latest["low"]),
        close=float(latest["close"]),
        volume=int(latest["volume"]),
        sma=sma_values,
        ema=ema_values,
        rsi=rsi,
        stoch_k=stoch_k,
        stoch_d=stoch_d,
        macd=macd_val,
        macd_signal=macd_signal_val,
        macd_histogram=macd_hist,
        adx=adx_val,
        plus_di=plus_di,
        minus_di=minus_di,
        atr=atr,
        bb_upper=bb_upper,
        bb_middle=bb_middle,
        bb_lower=bb_lower,
        bb_percent=bb_percent,
        vwap=vwap,
    )


def aggregate_candles(
    ticks: list[dict],
    timeframe: Timeframe,
) -> pd.DataFrame:
    """
    Aggregate tick data into OHLCV candles.
    
    Args:
        ticks: List of tick dictionaries with 'price', 'volume', 'timestamp'
        timeframe: Target candle timeframe
        
    Returns:
        DataFrame with OHLCV columns
    """
    if not ticks:
        return pd.DataFrame(columns=["open", "high", "low", "close", "volume"])
    
    df = pd.DataFrame(ticks)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df.set_index("timestamp", inplace=True)
    
    # Map timeframe to pandas resample string
    resample_map = {
        Timeframe.M1: "1min",
        Timeframe.M5: "5min",
        Timeframe.M15: "15min",
        Timeframe.M30: "30min",
        Timeframe.H1: "1h",
        Timeframe.H4: "4h",
        Timeframe.D1: "1D",
    }
    
    resampled = df.resample(resample_map[timeframe]).agg({
        "price": ["first", "max", "min", "last"],
        "volume": "sum",
    })
    
    resampled.columns = ["open", "high", "low", "close", "volume"]
    resampled.dropna(inplace=True)
    
    return resampled
