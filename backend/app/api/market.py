"""Market data routes for ASSETS."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.market_data import (
    VALID_PERIODS,
    df_to_records,
    market_data_service,
    normalize_ticker,
)

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/status")
async def market_status() -> dict:
    return market_data_service.get_market_status()


@router.get("/top-movers")
async def top_movers(
    n: int = Query(10, ge=1, le=50),
    exchange: str = Query("NSE"),
) -> list[dict]:
    try:
        return await market_data_service.get_top_movers(exchange=exchange, n=n)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/price/{ticker}")
async def live_price(ticker: str) -> dict:
    try:
        return await market_data_service.get_live_price(ticker)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get("/history/{ticker}")
async def history(
    ticker: str,
    period: str = Query("1y"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if period not in VALID_PERIODS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid period '{period}'. Valid: {sorted(VALID_PERIODS)}",
        )
    try:
        df = await market_data_service.fetch_ohlcv(ticker, period=period, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    return {
        "ticker": normalize_ticker(ticker),
        "period": period,
        "count": int(len(df)),
        "rows": df_to_records(df),
    }
