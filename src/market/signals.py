"""
Signal Engine Module

Rule-based strategy signal generation for trading decisions.
Generates signals that are then validated by the agentic decision layer.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any

from .indicators import IndicatorResult, Timeframe

logger = logging.getLogger(__name__)


class SignalType(Enum):
    """Types of trading signals."""
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"


class SignalStrength(Enum):
    """Signal strength classification."""
    WEAK = "weak"
    MODERATE = "moderate"
    STRONG = "strong"


class StrategyType(Enum):
    """Available trading strategies."""
    MOMENTUM = "momentum"
    MEAN_REVERSION = "mean_reversion"
    BREAKOUT = "breakout"
    TREND_FOLLOWING = "trend_following"


@dataclass
class TradingSignal:
    """Represents a trading signal from the signal engine."""
    
    signal_id: str
    symbol: str
    signal_type: SignalType
    strength: SignalStrength
    strategy: StrategyType
    timeframe: Timeframe
    
    # Entry/Exit levels
    entry_price: float
    stop_loss: float
    target_price: float
    
    # Risk metrics
    risk_reward_ratio: float
    position_size_pct: float  # Suggested position size as % of capital
    
    # Signal details
    confidence: float  # 0-1 confidence score
    reasons: list[str] = field(default_factory=list)
    indicators: dict[str, Any] = field(default_factory=dict)
    
    # Metadata
    timestamp: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for agent consumption."""
        return {
            "signal_id": self.signal_id,
            "symbol": self.symbol,
            "signal_type": self.signal_type.value,
            "strength": self.strength.value,
            "strategy": self.strategy.value,
            "timeframe": self.timeframe.value,
            "entry_price": self.entry_price,
            "stop_loss": self.stop_loss,
            "target_price": self.target_price,
            "risk_reward_ratio": self.risk_reward_ratio,
            "position_size_pct": self.position_size_pct,
            "confidence": self.confidence,
            "reasons": self.reasons,
            "indicators": self.indicators,
            "timestamp": self.timestamp.isoformat(),
        }


@dataclass
class SignalEngine:
    """
    Rule-based signal generation engine.
    
    Generates trading signals based on technical indicators.
    These signals are inputs to the agentic decision layer.
    """
    
    # Strategy parameters
    rsi_oversold: float = 30.0
    rsi_overbought: float = 70.0
    adx_trend_threshold: float = 25.0
    bb_squeeze_threshold: float = 0.1
    
    # Risk parameters
    default_stop_loss_pct: float = 2.0
    default_target_pct: float = 4.0
    max_position_size_pct: float = 10.0
    
    _signal_counter: int = field(default=0, repr=False)
    
    def generate_signals(
        self,
        indicators: IndicatorResult,
        active_strategies: list[StrategyType] | None = None,
    ) -> list[TradingSignal]:
        """
        Generate trading signals from indicator data.
        
        Args:
            indicators: Calculated indicators for a symbol
            active_strategies: List of strategies to run (all if None)
            
        Returns:
            List of generated trading signals
        """
        if active_strategies is None:
            active_strategies = list(StrategyType)
        
        signals = []
        
        for strategy in active_strategies:
            signal = self._run_strategy(indicators, strategy)
            if signal and signal.signal_type != SignalType.HOLD:
                signals.append(signal)
        
        return signals
    
    def _run_strategy(
        self,
        indicators: IndicatorResult,
        strategy: StrategyType,
    ) -> TradingSignal | None:
        """Run a specific strategy and return signal if generated."""
        
        if strategy == StrategyType.MOMENTUM:
            return self._momentum_strategy(indicators)
        elif strategy == StrategyType.MEAN_REVERSION:
            return self._mean_reversion_strategy(indicators)
        elif strategy == StrategyType.BREAKOUT:
            return self._breakout_strategy(indicators)
        elif strategy == StrategyType.TREND_FOLLOWING:
            return self._trend_following_strategy(indicators)
        
        return None
    
    def _momentum_strategy(self, ind: IndicatorResult) -> TradingSignal | None:
        """
        Momentum strategy based on RSI and MACD.
        
        BUY: RSI < 50 and rising, MACD histogram positive
        SELL: RSI > 50 and falling, MACD histogram negative
        """
        if ind.rsi is None or ind.macd_histogram is None:
            return None
        
        reasons = []
        signal_type = SignalType.HOLD
        strength = SignalStrength.WEAK
        confidence = 0.0
        
        # BUY conditions
        if ind.rsi < 50 and ind.macd_histogram > 0:
            signal_type = SignalType.BUY
            reasons.append(f"RSI at {ind.rsi:.1f} with room to run")
            reasons.append("MACD histogram positive (bullish momentum)")
            
            # Strength based on RSI level
            if ind.rsi < self.rsi_oversold:
                strength = SignalStrength.STRONG
                confidence = 0.8
                reasons.append("RSI in oversold territory")
            elif ind.rsi < 40:
                strength = SignalStrength.MODERATE
                confidence = 0.6
            else:
                confidence = 0.4
        
        # SELL conditions
        elif ind.rsi > 50 and ind.macd_histogram < 0:
            signal_type = SignalType.SELL
            reasons.append(f"RSI at {ind.rsi:.1f} showing weakness")
            reasons.append("MACD histogram negative (bearish momentum)")
            
            if ind.rsi > self.rsi_overbought:
                strength = SignalStrength.STRONG
                confidence = 0.8
                reasons.append("RSI in overbought territory")
            elif ind.rsi > 60:
                strength = SignalStrength.MODERATE
                confidence = 0.6
            else:
                confidence = 0.4
        
        if signal_type == SignalType.HOLD:
            return None
        
        return self._create_signal(
            ind, signal_type, strength, StrategyType.MOMENTUM, confidence, reasons
        )
    
    def _mean_reversion_strategy(self, ind: IndicatorResult) -> TradingSignal | None:
        """
        Mean reversion strategy based on Bollinger Bands and RSI.
        
        BUY: Price below lower BB and RSI oversold
        SELL: Price above upper BB and RSI overbought
        """
        if ind.bb_lower is None or ind.bb_upper is None or ind.rsi is None:
            return None
        
        reasons = []
        signal_type = SignalType.HOLD
        strength = SignalStrength.WEAK
        confidence = 0.0
        
        # BUY conditions - price touched lower BB
        if ind.close <= ind.bb_lower and ind.rsi < self.rsi_oversold:
            signal_type = SignalType.BUY
            strength = SignalStrength.STRONG
            confidence = 0.75
            reasons.append("Price at lower Bollinger Band")
            reasons.append(f"RSI oversold at {ind.rsi:.1f}")
            reasons.append("Mean reversion opportunity")
        
        elif ind.close <= ind.bb_lower:
            signal_type = SignalType.BUY
            strength = SignalStrength.MODERATE
            confidence = 0.5
            reasons.append("Price at lower Bollinger Band")
        
        # SELL conditions - price touched upper BB
        elif ind.close >= ind.bb_upper and ind.rsi > self.rsi_overbought:
            signal_type = SignalType.SELL
            strength = SignalStrength.STRONG
            confidence = 0.75
            reasons.append("Price at upper Bollinger Band")
            reasons.append(f"RSI overbought at {ind.rsi:.1f}")
            reasons.append("Mean reversion expected")
        
        elif ind.close >= ind.bb_upper:
            signal_type = SignalType.SELL
            strength = SignalStrength.MODERATE
            confidence = 0.5
            reasons.append("Price at upper Bollinger Band")
        
        if signal_type == SignalType.HOLD:
            return None
        
        return self._create_signal(
            ind, signal_type, strength, StrategyType.MEAN_REVERSION, confidence, reasons
        )
    
    def _breakout_strategy(self, ind: IndicatorResult) -> TradingSignal | None:
        """
        Breakout strategy based on Bollinger Band squeeze and price action.
        
        BUY: BB squeeze followed by upward breakout
        SELL: BB squeeze followed by downward breakout
        """
        if ind.bb_percent is None or ind.bb_upper is None or ind.bb_lower is None:
            return None
        
        reasons = []
        signal_type = SignalType.HOLD
        strength = SignalStrength.WEAK
        confidence = 0.0
        
        # Check for squeeze (bands are tight)
        bb_width = (ind.bb_upper - ind.bb_lower) / ind.bb_middle if ind.bb_middle else 0
        is_squeeze = bb_width < self.bb_squeeze_threshold
        
        if is_squeeze:
            # Breakout conditions with volume confirmation
            if ind.close > ind.bb_upper:
                signal_type = SignalType.BUY
                strength = SignalStrength.STRONG
                confidence = 0.7
                reasons.append("Bollinger Band squeeze breakout (upward)")
                reasons.append(f"Price broke above upper band at {ind.bb_upper:.2f}")
            
            elif ind.close < ind.bb_lower:
                signal_type = SignalType.SELL
                strength = SignalStrength.STRONG
                confidence = 0.7
                reasons.append("Bollinger Band squeeze breakout (downward)")
                reasons.append(f"Price broke below lower band at {ind.bb_lower:.2f}")
        
        if signal_type == SignalType.HOLD:
            return None
        
        return self._create_signal(
            ind, signal_type, strength, StrategyType.BREAKOUT, confidence, reasons
        )
    
    def _trend_following_strategy(self, ind: IndicatorResult) -> TradingSignal | None:
        """
        Trend following strategy based on ADX and moving average crossovers.
        
        BUY: Strong uptrend (ADX > threshold, +DI > -DI, price above EMAs)
        SELL: Strong downtrend (ADX > threshold, -DI > +DI, price below EMAs)
        """
        if ind.adx is None or ind.plus_di is None or ind.minus_di is None:
            return None
        
        if not ind.ema or 21 not in ind.ema:
            return None
        
        reasons = []
        signal_type = SignalType.HOLD
        strength = SignalStrength.WEAK
        confidence = 0.0
        
        ema_21 = ind.ema.get(21, 0)
        
        # Check if in strong trend
        if ind.adx > self.adx_trend_threshold:
            # Uptrend
            if ind.plus_di > ind.minus_di and ind.close > ema_21:
                signal_type = SignalType.BUY
                reasons.append(f"Strong uptrend with ADX at {ind.adx:.1f}")
                reasons.append(f"+DI ({ind.plus_di:.1f}) > -DI ({ind.minus_di:.1f})")
                reasons.append(f"Price above EMA21 ({ema_21:.2f})")
                
                if ind.adx > 40:
                    strength = SignalStrength.STRONG
                    confidence = 0.8
                else:
                    strength = SignalStrength.MODERATE
                    confidence = 0.6
            
            # Downtrend
            elif ind.minus_di > ind.plus_di and ind.close < ema_21:
                signal_type = SignalType.SELL
                reasons.append(f"Strong downtrend with ADX at {ind.adx:.1f}")
                reasons.append(f"-DI ({ind.minus_di:.1f}) > +DI ({ind.plus_di:.1f})")
                reasons.append(f"Price below EMA21 ({ema_21:.2f})")
                
                if ind.adx > 40:
                    strength = SignalStrength.STRONG
                    confidence = 0.8
                else:
                    strength = SignalStrength.MODERATE
                    confidence = 0.6
        
        if signal_type == SignalType.HOLD:
            return None
        
        return self._create_signal(
            ind, signal_type, strength, StrategyType.TREND_FOLLOWING, confidence, reasons
        )
    
    def _create_signal(
        self,
        ind: IndicatorResult,
        signal_type: SignalType,
        strength: SignalStrength,
        strategy: StrategyType,
        confidence: float,
        reasons: list[str],
    ) -> TradingSignal:
        """Create a trading signal with proper risk management levels."""
        
        self._signal_counter += 1
        signal_id = f"SIG-{datetime.now().strftime('%Y%m%d%H%M%S')}-{self._signal_counter:04d}"
        
        # Calculate entry, stop loss, and target
        entry_price = ind.close
        
        if signal_type == SignalType.BUY:
            # Use ATR-based stop if available, otherwise percentage
            if ind.atr:
                stop_loss = entry_price - (2 * ind.atr)
                target_price = entry_price + (3 * ind.atr)
            else:
                stop_loss = entry_price * (1 - self.default_stop_loss_pct / 100)
                target_price = entry_price * (1 + self.default_target_pct / 100)
        else:  # SELL
            if ind.atr:
                stop_loss = entry_price + (2 * ind.atr)
                target_price = entry_price - (3 * ind.atr)
            else:
                stop_loss = entry_price * (1 + self.default_stop_loss_pct / 100)
                target_price = entry_price * (1 - self.default_target_pct / 100)
        
        # Calculate risk-reward ratio
        risk = abs(entry_price - stop_loss)
        reward = abs(target_price - entry_price)
        risk_reward = reward / risk if risk > 0 else 0
        
        # Position size based on strength
        position_pct = {
            SignalStrength.WEAK: 3.0,
            SignalStrength.MODERATE: 5.0,
            SignalStrength.STRONG: min(8.0, self.max_position_size_pct),
        }[strength]
        
        return TradingSignal(
            signal_id=signal_id,
            symbol=ind.symbol,
            signal_type=signal_type,
            strength=strength,
            strategy=strategy,
            timeframe=ind.timeframe,
            entry_price=entry_price,
            stop_loss=stop_loss,
            target_price=target_price,
            risk_reward_ratio=risk_reward,
            position_size_pct=position_pct,
            confidence=confidence,
            reasons=reasons,
            indicators=ind.to_dict(),
        )
