"""Health-check endpoints for ASSETS."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
async def health() -> dict[str, str]:
    return {"status": "ok", "platform": "ASSETS"}


@router.get("/db")
async def health_db(db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    """Verify the database connection is alive."""
    await db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}
