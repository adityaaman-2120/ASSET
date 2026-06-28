"""Voice agent API routes for ASSETS (Smallest.ai / Atoms).

The browser uses ``atoms-client-sdk`` to run the real-time voice loop, but it
needs an access token that can only be minted with the secret Atoms API key.
These routes mint that token server-side so the key never reaches the browser.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.services.portfolio_service import portfolio_service
from app.services.smallest_service import smallest_service

router = APIRouter(prefix="/voice", tags=["voice"])


class WebCallRequest(BaseModel):
    mode: str = "webcall"  # "webcall" (voice) or "chat" (text)


def _build_portfolio_context(portfolios) -> dict:
    """Summarise the user's portfolios for the voice agent's context."""
    ready = [p for p in portfolios if getattr(p, "status", None) == "ready"]
    return {
        "portfolio_count": len(portfolios),
        "ready_count": len(ready),
        "total_invested": sum(getattr(p, "amount", 0) or 0 for p in portfolios),
        "portfolio_ids": [str(p.id) for p in portfolios],
    }


@router.post("/web-call", status_code=status.HTTP_201_CREATED)
async def create_web_call(
    payload: WebCallRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Mint a Smallest.ai (Atoms) session token for the browser SDK.

    Returns the access ``token`` and ``host`` the frontend passes to
    ``AtomsClient.startSession``, plus a lightweight portfolio context summary.
    """
    portfolios = await portfolio_service.list_for_user(db, current_user.id)
    portfolio_context = _build_portfolio_context(portfolios)
    portfolio_context["user_name"] = (
        current_user.full_name or current_user.email or "Client"
    )

    try:
        session = await smallest_service.create_web_call(mode=payload.mode)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    return {**session, "portfolio_context": portfolio_context}


@router.get("/config")
async def get_voice_config(
    current_user: User = Depends(get_current_user),
) -> dict:
    """Report whether the Smallest.ai voice agent is configured."""
    return {
        "agent_id": settings.SMALLEST_AGENT_ID,
        "configured": smallest_service.is_configured,
    }