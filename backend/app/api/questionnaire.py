"""Questionnaire routes for ASSETS (auth-protected)."""
from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.portfolio import Portfolio, PortfolioStatus, RiskLevel
from app.services.llm_service import llm_service
from app.services.analysis_pipeline import (
    default_portfolio_name,
    run_full_analysis_async,
)

router = APIRouter(prefix="/questionnaire", tags=["questionnaire"])

QUESTIONS = [
    {
        "id": "investment_goal",
        "question": "What is your primary investment goal?",
        "type": "single_choice",
        "options": ["Capital Growth", "Regular Income", "Wealth Preservation", "Tax Saving (ELSS)"],
    },
    {
        "id": "time_horizon",
        "question": "How long can you stay invested?",
        "type": "single_choice",
        "options": ["Less than 1 year", "1–3 years", "3–5 years", "5+ years"],
    },
    {
        "id": "risk_appetite",
        "question": "How would you react if your portfolio dropped 20% in a month?",
        "type": "single_choice",
        "options": [
            "Sell everything immediately",
            "Sell some to cut losses",
            "Hold and wait",
            "Buy more at the dip",
        ],
    },
    {
        "id": "investment_amount",
        "question": "How much are you looking to invest?",
        "type": "single_choice",
        "options": ["Under ₹10,000", "₹10,000–₹50,000", "₹50,000–₹2L", "₹2L–₹10L", "Above ₹10L"],
    },
    {
        "id": "income_stability",
        "question": "How stable is your monthly income?",
        "type": "single_choice",
        "options": [
            "Very stable (salaried)",
            "Somewhat stable",
            "Variable (freelance/business)",
            "No regular income",
        ],
    },
    {
        "id": "existing_investments",
        "question": "What do you already hold? (select all)",
        "type": "multi_choice",
        "options": ["FD/RD", "Mutual Funds", "Direct Stocks", "Gold", "Real Estate", "None"],
    },
    {
        "id": "sector_preference",
        "question": "Any sectors you prefer or want to avoid?",
        "type": "multi_choice_with_avoid",
        "prefer_options": [
            "Technology",
            "Banking & Finance",
            "Healthcare",
            "FMCG",
            "Infrastructure",
            "Energy",
        ],
        "avoid_options": ["Defence", "Tobacco/Alcohol", "Fossil Fuels", "Gambling", "None"],
    },
    {
        "id": "return_expectation",
        "question": "What annual return are you realistically targeting?",
        "type": "single_choice",
        "options": [
            "8–10% (FD-like, safe)",
            "10–15% (moderate growth)",
            "15–25% (aggressive growth)",
            "25%+ (high risk, high reward)",
        ],
    },
    {
        "id": "liquidity_need",
        "question": "How soon might you need this money back?",
        "type": "single_choice",
        "options": ["Anytime (keep liquid)", "6–12 months", "1–3 years", "3+ years (no rush)"],
    },
]


class AnalyzeQuestionnaireRequest(BaseModel):
    answers: dict[str, Any]


def map_answers_to_brief(answers: dict[str, Any]) -> dict[str, Any]:
    # 1. Horizon mapping
    horizon_map = {
        "Less than 1 year": 1,
        "1–3 years": 2,
        "3–5 years": 4,
        "5+ years": 5,
    }
    horizon = horizon_map.get(answers.get("time_horizon"), 3)

    # 2. Amount mapping (parse Indian notation or fallback)
    amount_map = {
        "Under ₹10,000": 5000.0,
        "₹10,000–₹50,000": 25000.0,
        "₹50,000–₹2L": 100000.0,
        "₹2L–₹10L": 500000.0,
        "Above ₹10L": 1500000.0,
    }
    amount = amount_map.get(answers.get("investment_amount"), 50000.0)

    # 3. Risk scoring
    appetite_scores = {
        "Sell everything immediately": 1,
        "Sell some to cut losses": 2,
        "Hold and wait": 3,
        "Buy more at the dip": 4,
    }
    score = appetite_scores.get(answers.get("risk_appetite"), 2)

    return_scores = {
        "8–10% (FD-like, safe)": 1,
        "10–15% (moderate growth)": 2,
        "15–25% (aggressive growth)": 3,
        "25%+ (high risk, high reward)": 4,
    }
    score += return_scores.get(answers.get("return_expectation"), 2)

    # Adjustments
    if answers.get("income_stability") == "No regular income":
        score -= 1
    if answers.get("liquidity_need") == "Anytime (keep liquid)":
        score -= 1

    # Mapping score to level
    if score <= 3:
        risk_level = "low"
    elif score >= 6:
        risk_level = "high"
    else:
        risk_level = "medium"

    if horizon == 1:
        risk_level = "low"

    # 4. Sector preference mapping
    pref_val = answers.get("sector_preference") or {}
    prefer_list = []
    avoid_list = []

    if isinstance(pref_val, dict):
        prefer_raw = pref_val.get("prefer") or []
        avoid_raw = pref_val.get("avoid") or []
    else:
        prefer_raw = []
        avoid_raw = []

    sector_map = {
        "Technology": "it",
        "Banking & Finance": "financials",
        "Healthcare": "pharma",
        "FMCG": "fmcg",
        "Infrastructure": "infrastructure",
        "Energy": "energy",
    }

    avoid_map = {
        "Defence": ["defense"],
        "Tobacco/Alcohol": ["tobacco"],
        "Fossil Fuels": ["energy", "oil_gas", "coal"],
        "Gambling": ["gambling"],
    }

    for item in prefer_raw:
        if item in sector_map:
            prefer_list.append(sector_map[item])

    for item in avoid_raw:
        if item in avoid_map:
            avoid_list.extend(avoid_map[item])

    prefer_list = list(set(prefer_list))
    avoid_list = list(set(avoid_list))

    constraints = {
        "excluded_sectors": avoid_list,
        "min_dividend": None,
        "esg_only": False,
        "preferred_sectors": prefer_list,
    }

    return {
        "amount": amount,
        "risk_level": risk_level,
        "horizon_years": horizon,
        "constraints": constraints,
        "raw_intent": f"Questionnaire-based investment profile ({risk_level} risk, {horizon}y horizon)",
    }


@router.get("/questions")
async def get_questions(current_user: User = Depends(get_current_user)):
    return QUESTIONS


@router.post("/analyze")
async def analyze_questionnaire(
    payload: AnalyzeQuestionnaireRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        # 1. Map answers to brief
        brief = map_answers_to_brief(payload.answers)
        constraints = llm_service.compile_constraints(brief)

        # 2. Create pending portfolio in DB
        name = default_portfolio_name(brief)
        portfolio = Portfolio(
            user_id=current_user.id,
            name=name,
            goal_text=brief["raw_intent"],
            amount=brief["amount"],
            risk_level=RiskLevel(brief["risk_level"]),
            horizon_years=brief["horizon_years"],
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

        # Launch pipeline as a background task so we return immediately
        portfolio_id = str(portfolio.id)
        background_tasks.add_task(run_full_analysis_async, portfolio_id)

        # Return portfolio_id so the frontend can poll /api/v1/analysis/status/{id}
        return {"portfolio_id": portfolio_id, "status": "processing"}

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Questionnaire analysis failed: {str(exc)}",
        )
