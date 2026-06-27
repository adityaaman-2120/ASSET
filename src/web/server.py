import asyncio
import json
import logging
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from fastapi import FastAPI, Request, Response
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from sse_starlette.sse import EventSourceResponse
from pathlib import Path

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).parent / "templates"


@dataclass
class DashboardState:
    trading_mode: str = "paper"
    data_source: str = "simulated"
    session_start: str = ""
    current_balance: float = 1000000.0
    starting_balance: float = 1000000.0
    realized_pnl: float = 0.0
    unrealized_pnl: float = 0.0
    best_trade: float = 0.0
    worst_trade: float = 0.0
    total_trades: int = 0
    winning_trades: int = 0
    losing_trades: int = 0
    current_regime: str = "unknown"
    regime_confidence: float = 0.0
    active_strategies: list[str] = field(default_factory=list)
    cycles_run: int = 0
    signals_generated: int = 0
    signals_validated: int = 0
    signals_rejected: int = 0
    trades_approved: int = 0
    trades_risk_rejected: int = 0
    market_quotes: dict[str, dict] = field(default_factory=dict)
    open_positions: list[dict] = field(default_factory=list)
    current_signal: dict = field(default_factory=dict)
    last_decision_reason: str = ""
    activity_log: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        now = datetime.now()
        elapsed = ""
        if self.session_start:
            try:
                start = datetime.fromisoformat(self.session_start)
                delta = now - start
                hours, rem = divmod(int(delta.total_seconds()), 3600)
                minutes, seconds = divmod(rem, 60)
                elapsed = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
            except: # noqa
                pass

        total_pnl = self.realized_pnl + self.unrealized_pnl
        pnl_pct = (total_pnl / self.starting_balance * 100) if self.starting_balance > 0 else 0
        win_rate = (self.winning_trades / self.total_trades * 100) if self.total_trades > 0 else 0

        return {
            "trading_mode": self.trading_mode,
            "data_source": self.data_source,
            "session_elapsed": elapsed,
            "current_balance": round(self.current_balance, 2),
            "starting_balance": round(self.starting_balance, 2),
            "realized_pnl": round(self.realized_pnl, 2),
            "unrealized_pnl": round(self.unrealized_pnl, 2),
            "total_pnl": round(total_pnl, 2),
            "pnl_percent": round(pnl_pct, 2),
            "best_trade": round(self.best_trade, 2),
            "worst_trade": round(self.worst_trade, 2),
            "total_trades": self.total_trades,
            "winning_trades": self.winning_trades,
            "losing_trades": self.losing_trades,
            "win_rate": round(win_rate, 1),
            "current_regime": self.current_regime,
            "regime_confidence": round(self.regime_confidence, 2),
            "active_strategies": self.active_strategies,
            "cycles_run": self.cycles_run,
            "signals_generated": self.signals_generated,
            "signals_validated": self.signals_validated,
            "signals_rejected": self.signals_rejected,
            "trades_approved": self.trades_approved,
            "trades_risk_rejected": self.trades_risk_rejected,
            "market_quotes": self.market_quotes,
            "open_positions": self.open_positions,
            "current_signal": self.current_signal,
            "last_decision_reason": self.last_decision_reason,
            "activity_log": self.activity_log[-20:] if self.activity_log else [],
        }


state = DashboardState()
state.session_start = datetime.now().isoformat()

_state_lock = asyncio.Lock()
_sse_queues: list[asyncio.Queue] = []


async def update_state(updates: dict):
    async with _state_lock:
        for key, value in updates.items():
            if hasattr(state, key):
                setattr(state, key, value)
        data = state.to_dict()
    for q in _sse_queues:
        try:
            q.put_nowait(data)
        except asyncio.QueueFull:
            pass


def get_state() -> dict:
    return state.to_dict()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async def cleanup():
        _sse_queues.clear()
    yield
    await cleanup()


app = FastAPI(lifespan=lifespan)


@app.get("/", response_class=HTMLResponse)
async def dashboard():
    html_path = TEMPLATES_DIR / "dashboard.html"
    if not html_path.exists():
        return HTMLResponse("<h1>Dashboard template not found</h1>", status_code=500)
    return HTMLResponse(html_path.read_text(encoding="utf-8"))


@app.get("/api/state")
async def api_state():
    return get_state()


@app.get("/api/events")
async def sse_events(request: Request):
    queue: asyncio.Queue = asyncio.Queue(maxsize=50)

    async with _state_lock:
        _sse_queues.append(queue)

    async def event_generator():
        try:
            yield {"event": "connected", "data": json.dumps({"status": "ok"})}
            yield {"event": "state", "data": json.dumps(get_state())}
            while True:
                if await request.is_disconnected():
                    break
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=30)
                    yield {"event": "state", "data": json.dumps(data)}
                except asyncio.TimeoutError:
                    yield {"event": "ping", "data": ""}
        finally:
            async with _state_lock:
                if queue in _sse_queues:
                    _sse_queues.remove(queue)

    return EventSourceResponse(event_generator())
