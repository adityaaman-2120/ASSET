"""Per-ticker, per-day analysis cache for ASSETS.

Stores fetched OHLCV data and computed technical indicators so we don't refetch
or recompute on every request.
"""
from __future__ import annotations

from datetime import date as date_type, datetime

from sqlalchemy import Date, DateTime, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AnalysisCache(Base):
    __tablename__ = "analysis_cache"

    ticker: Mapped[str] = mapped_column(String(20), primary_key=True)
    date: Mapped[date_type] = mapped_column(Date, primary_key=True)
    ohlcv_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    indicators: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    cached_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
