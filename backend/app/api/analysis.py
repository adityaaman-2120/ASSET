"""Analysis routes for ASSETS (auth-protected)."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.portfolio import Portfolio, PortfolioStatus, RiskLevel
from app.schemas.portfolio import WhatIfRequest
from app.services.llm_service import llm_service
from app.services.portfolio_service import portfolio_service
from app.services.analysis_pipeline import (
    default_portfolio_name,
    build_portfolio_json,
    rebalance as pipeline_rebalance,
)
from app.core.config import settings

router = APIRouter(prefix="/analysis", tags=["analysis"])


class AnalyzeRequest(BaseModel):
    goal_text: str


class RebalanceRequest(BaseModel):
    new_risk_level: str


@router.post("/analyze", status_code=status.HTTP_201_CREATED)
async def analyze(
    payload: AnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        # 1. Call LLMService.extract_investment_brief(goal_text)
        brief = await llm_service.extract_investment_brief(payload.goal_text)
        
        # 2. Call LLMService.compile_constraints(brief)
        constraints = llm_service.compile_constraints(brief)
        
        # 3. Create a pending portfolio in DB
        name = default_portfolio_name(brief)
        portfolio = Portfolio(
            user_id=current_user.id,
            name=name,
            goal_text=payload.goal_text,
            amount=brief.get("amount") or 0.0,
            risk_level=RiskLevel(brief.get("risk_level", "medium")),
            horizon_years=brief.get("horizon_years"),
            constraints={
                "brief": brief,
                "compiled": constraints,
            },
            status=PortfolioStatus.pending,
            progress=0,
        )
        db.add(portfolio)
        await db.commit()
        await db.refresh(portfolio)
        
        return {
            "brief": brief,
            "constraints": constraints,
            "portfolio_id": str(portfolio.id),
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Analysis initiation failed: {str(exc)}"
        )


@router.post("/confirm/{portfolio_id}")
async def confirm(
    portfolio_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    portfolio = await db.get(Portfolio, portfolio_id)
    if portfolio is None or portfolio.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
        
    task_id = None
    try:
        if settings.REDIS_URL:
            from app.celery_app import run_full_analysis
            task = run_full_analysis.delay(str(portfolio_id))
            task_id = task.id
    except Exception:
        pass
        
    if not task_id:
        # Fallback to local background task
        from app.services.analysis_pipeline import run_full_analysis_async
        # Commit progress start to db
        portfolio.status = PortfolioStatus.processing
        portfolio.progress = 5
        await db.commit()
        
        background_tasks.add_task(run_full_analysis_async, str(portfolio_id))
        task_id = "in_process"
        
    return {
        "task_id": task_id,
        "portfolio_id": str(portfolio_id)
    }


@router.get("/status/{portfolio_id}")
async def get_status(
    portfolio_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    
    result = await db.execute(
        select(Portfolio)
        .where(Portfolio.id == portfolio_id, Portfolio.user_id == current_user.id)
        .options(selectinload(Portfolio.holdings))
    )
    portfolio = result.scalar_one_or_none()
    
    if portfolio is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
        
    response = {
        "status": portfolio.status.value,
        "progress": portfolio.progress,
    }
    
    if portfolio.status == PortfolioStatus.ready:
        response["portfolio"] = build_portfolio_json(portfolio)
    else:
        response["portfolio"] = None
        
    return response


@router.get("/portfolio/{portfolio_id}")
async def get_portfolio(
    portfolio_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    
    result = await db.execute(
        select(Portfolio)
        .where(Portfolio.id == portfolio_id, Portfolio.user_id == current_user.id)
        .options(selectinload(Portfolio.holdings))
    )
    portfolio = result.scalar_one_or_none()
    
    if portfolio is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
        
    return build_portfolio_json(portfolio)


@router.post("/rebalance/{portfolio_id}")
async def rebalance_portfolio(
    portfolio_id: uuid.UUID,
    payload: RebalanceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    
    result = await db.execute(
        select(Portfolio)
        .where(Portfolio.id == portfolio_id, Portfolio.user_id == current_user.id)
        .options(selectinload(Portfolio.holdings))
    )
    portfolio = result.scalar_one_or_none()
    
    if portfolio is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
        
    try:
        res = await pipeline_rebalance(db, portfolio, payload.new_risk_level)
        return res
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc)
        )


@router.post("/whatif/{portfolio_id}")
async def whatif_portfolio(
    portfolio_id: uuid.UUID,
    payload: WhatIfRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    
    result = await db.execute(
        select(Portfolio)
        .where(Portfolio.id == portfolio_id, Portfolio.user_id == current_user.id)
        .options(selectinload(Portfolio.holdings))
    )
    portfolio = result.scalar_one_or_none()
    
    if portfolio is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
        
    answer = await portfolio_service.answer_what_if(portfolio, payload.question)
    return {"answer": answer}
