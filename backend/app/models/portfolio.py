"""Portfolio model for ASSETS."""
from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum as PyEnum
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.holding import Holding
    from app.models.user import User


class RiskLevel(str, PyEnum):
    low = "low"
    medium = "medium"
    high = "high"


class PortfolioStatus(str, PyEnum):
    pending = "pending"
    processing = "processing"
    ready = "ready"


class Portfolio(Base):
    __tablename__ = "portfolios"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Raw natural-language goal as typed by the user.
    goal_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[RiskLevel] = mapped_column(
        SAEnum(RiskLevel, name="risk_level"),
        nullable=False,
        default=RiskLevel.medium,
    )
    horizon_years: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # e.g. {"excluded_sectors": ["tobacco", "defense"]}
    constraints: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[PortfolioStatus] = mapped_column(
        SAEnum(PortfolioStatus, name="portfolio_status"),
        nullable=False,
        default=PortfolioStatus.pending,
    )
    # 0-100 analysis progress, updated by the run_full_analysis task.
    progress: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
    # Full computed analysis output (weights, metrics, stress test, critique,
    # charts data, per-ticker predictions, task_id, error).
    results: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship(back_populates="portfolios")
    holdings: Mapped[list["Holding"]] = relationship(
        back_populates="portfolio", cascade="all, delete-orphan"
    )
