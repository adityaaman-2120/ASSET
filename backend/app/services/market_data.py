"""Market data service for ASSETS.

Wraps yfinance for OHLCV / live prices / movers, with a Postgres-backed cache
(the ``analysis_cache`` table). All blocking yfinance/pandas work is pushed to a
worker thread so it never blocks the async event loop.

Market context is the Indian NSE: trading 09:15-15:30 IST, Monday-Friday
(exchange holidays are not modelled here).
"""
from __future__ import annotations

import asyncio
import base64
import io
from datetime import date as date_type, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

import pandas as pd
import yfinance as yf
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analysis_cache import AnalysisCache

# --- Constants ---------------------------------------------------------------

IST = ZoneInfo("Asia/Kolkata")
MARKET_OPEN = time(9, 15)
MARKET_CLOSE = time(15, 30)

VALID_PERIODS = {
    "1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max",
}

_EXCHANGE_SUFFIX = {"NSE": ".NS", "BSE": ".BO"}

# Nifty 50 constituents (NSE), with the yfinance ``.NS`` suffix.
NIFTY_50 = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "ICICIBANK.NS", "INFY.NS",
    "HINDUNILVR.NS", "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "BAJFINANCE.NS",
    "KOTAKBANK.NS", "LT.NS", "HCLTECH.NS", "AXISBANK.NS", "ASIANPAINT.NS",
    "MARUTI.NS", "SUNPHARMA.NS", "TITAN.NS", "ULTRACEMCO.NS", "WIPRO.NS",
    "NESTLEIND.NS", "ONGC.NS", "NTPC.NS", "POWERGRID.NS", "M&M.NS",
    "TATAMOTORS.NS", "TATASTEEL.NS", "JSWSTEEL.NS", "ADANIENT.NS", "ADANIPORTS.NS",
    "COALINDIA.NS", "BAJAJFINSV.NS", "GRASIM.NS", "HDFCLIFE.NS", "SBILIFE.NS",
    "BRITANNIA.NS", "DIVISLAB.NS", "DRREDDY.NS", "CIPLA.NS", "EICHERMOT.NS",
    "HEROMOTOCO.NS", "HINDALCO.NS", "INDUSINDBK.NS", "BAJAJ-AUTO.NS", "TECHM.NS",
    "APOLLOHOSP.NS", "BPCL.NS", "TATACONSUM.NS", "UPL.NS", "LTIM.NS",
]


# --- Public helpers ----------------------------------------------------------

def normalize_ticker(ticker: str, exchange: str = "NSE") -> str:
    """Uppercase and add the exchange suffix if the caller omitted it."""
    ticker = ticker.upper().strip()
    if "." in ticker:
        return ticker
    return ticker + _EXCHANGE_SUFFIX.get(exchange.upper(), ".NS")


def now_ist() -> datetime:
    return datetime.now(IST)


def is_market_open(dt: datetime | None = None) -> bool:
    dt = dt or now_ist()
    if dt.weekday() >= 5:  # Saturday / Sunday
        return False
    return MARKET_OPEN <= dt.timetz().replace(tzinfo=None) <= MARKET_CLOSE


def market_session(dt: datetime) -> str:
    """One of 'pre' / 'live' / 'post' / 'closed'."""
    if dt.weekday() >= 5:
        return "closed"
    t = dt.time()
    if t < MARKET_OPEN:
        return "pre"
    if t <= MARKET_CLOSE:
        return "live"
    return "post"


def next_market_open(dt: datetime) -> datetime:
    """Next strictly-future market open (09:15 IST on a weekday)."""
    open_today = dt.replace(
        hour=MARKET_OPEN.hour, minute=MARKET_OPEN.minute, second=0, microsecond=0
    )
    if dt < open_today and dt.weekday() < 5:
        return open_today
    candidate = (dt + timedelta(days=1)).replace(
        hour=MARKET_OPEN.hour, minute=MARKET_OPEN.minute, second=0, microsecond=0
    )
    while candidate.weekday() >= 5:
        candidate += timedelta(days=1)
    return candidate


def df_to_records(df: pd.DataFrame) -> list[dict]:
    """Convert an OHLCV DataFrame to JSON-friendly row dicts."""
    if df is None or df.empty:
        return []
    out = df.reset_index()
    date_col = out.columns[0]
    records: list[dict] = []
    for row in out.itertuples(index=False):
        d = dict(zip(out.columns, row))
        ts = pd.Timestamp(d[date_col])
        records.append(
            {
                "date": ts.strftime("%Y-%m-%d"),
                "open": _num(d.get("Open")),
                "high": _num(d.get("High")),
                "low": _num(d.get("Low")),
                "close": _num(d.get("Close")),
                "volume": _int(d.get("Volume")),
            }
        )
    return records


# --- Internal numeric coercion ----------------------------------------------

def _num(v) -> float | None:
    try:
        if v is None or pd.isna(v):
            return None
        return round(float(v), 4)
    except (TypeError, ValueError):
        return None


def _int(v) -> int | None:
    try:
        if v is None or pd.isna(v):
            return None
        return int(v)
    except (TypeError, ValueError):
        return None


def _df_to_parquet_b64(df: pd.DataFrame) -> str:
    buf = io.BytesIO()
    df.to_parquet(buf, engine="pyarrow", index=True)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def _parquet_b64_to_df(data: str) -> pd.DataFrame:
    raw = base64.b64decode(data)
    return pd.read_parquet(io.BytesIO(raw), engine="pyarrow")


# --- Service -----------------------------------------------------------------

class MarketDataService:
    # -- OHLCV with cache -----------------------------------------------------

    async def fetch_ohlcv(
        self,
        ticker: str,
        period: str = "1y",
        db: AsyncSession | None = None,
    ) -> pd.DataFrame:
        """Fetch OHLCV for ``ticker``.

        Checks the ``analysis_cache`` table first (valid 1h during market hours,
        24h otherwise). On a miss, fetches from yfinance and upserts the cache.
        Pass ``db=None`` to bypass the cache entirely.
        """
        ticker = normalize_ticker(ticker)
        now = datetime.now(timezone.utc)
        today = now_ist().date()

        if db is not None:
            cached = await self._read_cache(db, ticker, today, period, now)
            if cached is not None:
                return cached

        df = await asyncio.to_thread(self._download_single, ticker, period)
        if df is None or df.empty:
            raise ValueError(f"No OHLCV data available for '{ticker}'.")

        if db is not None:
            await self._write_cache(db, ticker, today, period, df, now)
        return df

    async def _read_cache(
        self,
        db: AsyncSession,
        ticker: str,
        today: date_type,
        period: str,
        now: datetime,
    ) -> pd.DataFrame | None:
        row = await db.get(AnalysisCache, (ticker, today))
        if row is None or not row.ohlcv_data:
            return None
        payload = row.ohlcv_data
        if payload.get("format") != "parquet+b64" or payload.get("period") != period:
            return None

        max_age = timedelta(hours=1) if is_market_open() else timedelta(hours=24)
        cached_at = row.cached_at
        if cached_at.tzinfo is None:
            cached_at = cached_at.replace(tzinfo=timezone.utc)
        if now - cached_at > max_age:
            return None

        try:
            return _parquet_b64_to_df(payload["data"])
        except Exception:
            return None

    async def _write_cache(
        self,
        db: AsyncSession,
        ticker: str,
        today: date_type,
        period: str,
        df: pd.DataFrame,
        now: datetime,
    ) -> None:
        payload = {
            "format": "parquet+b64",
            "period": period,
            "rows": int(len(df)),
            "data": _df_to_parquet_b64(df),
        }
        stmt = pg_insert(AnalysisCache).values(
            ticker=ticker, date=today, ohlcv_data=payload, cached_at=now
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["ticker", "date"],
            set_={"ohlcv_data": payload, "cached_at": now},
        )
        await db.execute(stmt)
        await db.commit()

    @staticmethod
    def _download_single(ticker: str, period: str) -> pd.DataFrame | None:
        df = yf.Ticker(ticker).history(period=period, auto_adjust=True)
        if df is None or df.empty:
            return None
        return df

    # -- Top movers -----------------------------------------------------------

    async def get_top_movers(self, exchange: str = "NSE", n: int = 10) -> list[dict]:
        if exchange.upper() != "NSE":
            raise ValueError(
                f"Unsupported exchange '{exchange}'. Only 'NSE' (Nifty 50) is "
                "currently supported."
            )
        movers = await asyncio.to_thread(self._compute_movers)
        movers.sort(key=lambda m: abs(m["change_pct"]), reverse=True)
        return movers[:n]

    @staticmethod
    def _compute_movers() -> list[dict]:
        data = yf.download(
            NIFTY_50,
            period="2mo",
            interval="1d",
            auto_adjust=True,
            group_by="ticker",
            progress=False,
            threads=True,
        )
        results: list[dict] = []
        multi = isinstance(data.columns, pd.MultiIndex)
        for ticker in NIFTY_50:
            try:
                sub = data[ticker] if multi else data
                closes = sub["Close"].dropna()
                volumes = sub["Volume"].dropna()
            except (KeyError, TypeError):
                continue
            if len(closes) < 2:
                continue

            last_close = float(closes.iloc[-1])
            prev_close = float(closes.iloc[-2])
            change_pct = (last_close / prev_close - 1) * 100 if prev_close else 0.0

            last_vol = int(volumes.iloc[-1]) if len(volumes) else None
            prior = volumes.iloc[:-1].tail(20)
            avg_vol = float(prior.mean()) if len(prior) else None
            vol_spike = (
                round(last_vol / avg_vol, 2)
                if last_vol and avg_vol
                else None
            )

            results.append(
                {
                    "ticker": ticker,
                    "last_price": round(last_close, 2),
                    "change_pct": round(change_pct, 2),
                    "direction": "up" if change_pct >= 0 else "down",
                    "volume": last_vol,
                    "avg_volume_20d": int(avg_vol) if avg_vol else None,
                    "volume_spike": vol_spike,
                }
            )
        return results

    # -- Live price -----------------------------------------------------------

    async def get_live_price(self, ticker: str) -> dict:
        ticker = normalize_ticker(ticker)
        return await asyncio.to_thread(self._live_price, ticker)

    @staticmethod
    def _live_price(ticker: str) -> dict:
        t = yf.Ticker(ticker)
        last = prev = None
        vol = None
        try:
            fi = t.fast_info
            last = float(fi.last_price)
            prev = float(fi.previous_close)
            vol = int(fi.last_volume) if fi.last_volume else None
        except Exception:
            pass

        # Backfill anything fast_info couldn't provide (common outside market
        # hours, when there is no current-session volume) from recent history.
        if last is None or prev is None or vol is None:
            hist = t.history(period="5d", auto_adjust=True)
            if hist is None or hist.empty:
                if last is None:
                    raise ValueError(f"No live price available for '{ticker}'.")
            else:
                if last is None:
                    last = float(hist["Close"].iloc[-1])
                if prev is None:
                    prev = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else last
                if vol is None:
                    vol = int(hist["Volume"].iloc[-1])

        change = last - prev if prev is not None else 0.0
        change_pct = (change / prev * 100) if prev else 0.0
        return {
            "ticker": ticker,
            "price": round(last, 2),
            "previous_close": round(prev, 2) if prev is not None else None,
            "change": round(change, 2),
            "change_pct": round(change_pct, 2),
            "volume": vol,
            "as_of": datetime.now(timezone.utc).isoformat(),
        }

    # -- Market status --------------------------------------------------------

    def get_market_status(self) -> dict:
        now = now_ist()
        session = market_session(now)
        return {
            "is_open": session == "live",
            "session": session,
            "next_open": next_market_open(now),
            "server_time_ist": now,
            "timezone": "Asia/Kolkata",
        }


# Module-level singleton used by the API layer.
market_data_service = MarketDataService()
