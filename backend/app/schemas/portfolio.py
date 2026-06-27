"""Pydantic schemas for portfolios and holdings."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator


class PortfolioCreate(BaseModel):
    goal_text: str
    name: str | None = None
    candidate_limit: int = 12


class WhatIfRequest(BaseModel):
    question: str


class HoldingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    ticker: str
    company_name: str | None = None
    sector: str | None = None
    weight: float | None = None
    predicted_return: float | None = None
    confidence: float | None = None
    shap_explanation: dict[str, Any] | None = None


class PortfolioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    goal_text: str | None = None
    amount: float
    risk_level: str
    horizon_years: int | None = None
    constraints: dict[str, Any] | None = None
    status: str
    created_at: datetime
    holdings: list[HoldingOut] = []

    @field_validator("risk_level", "status", mode="before")
    @classmethod
    def _enum_to_value(cls, v):
        return getattr(v, "value", v)


class GenerateResponse(BaseModel):
    portfolio: PortfolioOut
    brief: dict[str, Any]
    constraints: dict[str, Any]
    metrics: dict[str, Any]
    critique: dict[str, Any]
    candidates_evaluated: int


class WhatIfResponse(BaseModel):
    answer: str
