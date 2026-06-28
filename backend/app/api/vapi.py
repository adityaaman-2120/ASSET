"""VAPI voice call API routes for ASSETS."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.services.portfolio_service import portfolio_service
from app.services.vapi_service import vapi_service

router = APIRouter(prefix="/vapi", tags=["vapi"])


class CallRequest(BaseModel):
    phone: str
    user_id: str | None = None
    portfolio_ids: list[str] = []
    metadata: dict | None = None


class EndCallRequest(BaseModel):
    call_id: str


class CallStatusRequest(BaseModel):
    call_id: str


@router.post("/calls", status_code=status.HTTP_201_CREATED)
async def initiate_call(
    payload: CallRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Initiate a voice call for portfolio discussion.

    The user receives a call at the provided phone number.
    The AI advisor uses the user's portfolio context for the conversation.
    """
    # Fetch user's portfolios for context
    portfolios = await portfolio_service.list_for_user(db, current_user.id)
    ready_portfolios = [p for p in portfolios if getattr(p, 'status', None) == 'ready']

    portfolio_context = {
        "metadata": {
            "user_name": current_user.full_name or current_user.email or "User",
            "portfolio_count": len(portfolios),
            "ready_count": len(ready_portfolios),
            "total_invested": sum(getattr(p, 'amount', 0) or 0 for p in portfolios),
            "portfolio_ids": [str(p.id) for p in portfolios],
        }
    }

    try:
        result = await vapi_service.initiate_call(
            phone=payload.phone,
            user_id=str(current_user.id),
            portfolio_data=portfolio_context,
        )
        return result
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        )


@router.post("/calls/end")
async def end_call(
    payload: EndCallRequest,
    current_user: User = Depends(get_current_user),
) -> dict:
    """End an active call by its call_id."""
    try:
        result = await vapi_service.end_call(payload.call_id)
        return result
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )


@router.post("/calls/status")
async def get_call_status(
    payload: CallStatusRequest,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Get the current status of a call."""
    try:
        return await vapi_service.get_call_status(payload.call_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )


@router.get("/calls")
async def list_calls(
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    """List all calls for the current user."""
    return await vapi_service.list_calls(user_id=str(current_user.id))


@router.get("/config")
async def get_vapi_config(
    current_user: User = Depends(get_current_user),
) -> dict:
    """Return VAPI configuration for the frontend (WebRTC)."""
    return {
        "assistant_id": settings.VAPI_ASSISTANT_ID,
        "has_api_key": bool(settings.VAPI_API_KEY),
    }