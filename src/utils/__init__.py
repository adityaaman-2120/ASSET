"""
Utilities module for ASSETS.

Provides common utilities:
- Rate limiting for API calls
- TTL caching for expensive operations
- Error types for structured exception handling
- Circuit breaker for resilience
- Event bus for pub/sub communication
"""

from .rate_limiter import RateLimiter, rate_limited, get_groq_limiter
from .cache import TTLCache, cached, get_news_cache, get_quote_cache, get_sentiment_cache
from .errors import (
    TradingError,
    RateLimitError,
    LLMResponseError,
    BrokerConnectionError,
    OrderRejectedError,
    InsufficientFundsError,
    MarketDataError,
    ConfigurationError,
    is_retryable_error,
    get_retry_delay,
)
from .circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerOpenError,
    get_groq_circuit_breaker,
    get_broker_circuit_breaker,
    get_market_data_circuit_breaker,
)
from .events import (
    EventBus,
    TradingEvent,
    EventType,
    get_event_bus,
)

__all__ = [
    # Rate limiting
    "RateLimiter",
    "rate_limited",
    "get_groq_limiter",
    # Caching
    "TTLCache",
    "cached",
    "get_news_cache",
    "get_quote_cache",
    "get_sentiment_cache",
    # Errors
    "TradingError",
    "RateLimitError",
    "LLMResponseError",
    "BrokerConnectionError",
    "OrderRejectedError",
    "InsufficientFundsError",
    "MarketDataError",
    "ConfigurationError",
    "is_retryable_error",
    "get_retry_delay",
    # Circuit breaker
    "CircuitBreaker",
    "CircuitBreakerOpenError",
    "get_groq_circuit_breaker",
    "get_broker_circuit_breaker",
    "get_market_data_circuit_breaker",
    # Events
    "EventBus",
    "TradingEvent",
    "EventType",
    "get_event_bus",
]
