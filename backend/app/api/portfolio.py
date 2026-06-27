"""Portfolio routes for ASSETS (auth-protected)."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.portfolio import (
    GenerateResponse,
    PortfolioCreate,
    PortfolioOut,
    WhatIfRequest,
    WhatIfResponse,
)
from app.services.portfolio_service import portfolio_service

router = APIRouter(prefix="/portfolios", tags=["portfolios"])


@router.post("", response_model=GenerateResponse, status_code=status.HTTP_201_CREATED)
async def create_portfolio(
    payload: PortfolioCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    try:
        return await portfolio_service.generate(
            db,
            current_user.id,
            payload.goal_text,
            name=payload.name,
            candidate_limit=payload.candidate_limit,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("", response_model=list[PortfolioOut])
async def list_portfolios(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await portfolio_service.list_for_user(db, current_user.id)


@router.get("/{portfolio_id}", response_model=PortfolioOut)
async def get_portfolio(
    portfolio_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    portfolio = await portfolio_service.get(db, portfolio_id, current_user.id)
    if portfolio is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found")
    return portfolio


@router.post("/{portfolio_id}/what-if", response_model=WhatIfResponse)
async def portfolio_what_if(
    portfolio_id: uuid.UUID,
    payload: WhatIfRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    portfolio = await portfolio_service.get(db, portfolio_id, current_user.id)
    if portfolio is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found")
    answer = await portfolio_service.answer_what_if(portfolio, payload.question)
    return {"answer": answer}
