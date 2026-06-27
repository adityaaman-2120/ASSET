"""
ASSETS Web Dashboard - Standalone Demo Mode
No API keys, no configuration needed. Just runs.
"""

import asyncio
import json
import random
import sys
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from sse_starlette.sse import EventSourceResponse

TEMPLATES_DIR = Path(__file__).parent.parent / "src" / "web" / "templates"

NSE_SYMBOLS = [
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
    "HINDUNILVR", "SBIN", "BHARTIARTL", "ITC", "KOTAKBANK",
    "LT", "AXISBANK", "ASIANPAINT", "MARUTI", "TITAN",
    "BAJFINANCE", "WIPRO", "ULTRACEMCO", "NESTLEIND", "TECHM",
]

BASE_PRICES = {
    "RELIANCE": 2450, "TCS": 4200, "HDFCBANK": 1680, "INFY": 1850,
    "ICICIBANK": 1280, "HINDUNILVR": 2350, "SBIN": 780, "BHARTIARTL": 1620,
    "ITC": 465, "KOTAKBANK": 1820, "LT": 3650, "AXISBANK": 1150,
    "ASIANPAINT": 2280, "MARUTI": 11200, "TITAN": 3450, "BAJFINANCE": 7200,
    "WIPRO": 295, "ULTRACEMCO": 11500, "NESTLEIND": 2180, "TECHM": 1680,
}

REGIMES = [
    ("trending_up", "🟢 BULL"),
    ("trending_down", "🔴 BEAR"),
    ("ranging", "🟡 RANGE"),
    ("volatile", "🟣 VOLATILE"),
]

STRATEGIES_POOL = [
    "momentum", "trend_following", "mean_reversion",
    "breakout", "rsi_oversold", "moving_average_cross",
]

LEVEL_ICONS = {"INFO": "ℹ", "SUCCESS": "✓", "WARNING": "⚠", "ERROR": "✗", "TRADE": "💹"}

prices = {s: float(BASE_PRICES[s]) for s in NSE_SYMBOLS}
trends = {s: random.uniform(-0.003, 0.003) for s in NSE_SYMBOLS}
activity = []
cycle_count = 0
signals_gen = 0
signals_val = 0
signals_rej = 0
trades_appr = 0
trades_risk = 0
total_trades_val = 0
winning_trades_val = 0
losing_trades_val = 0
realized_pnl_val = 0.0
best_trade_val = 0.0
worst_trade_val = 0.0
current_balance = 1000000.0
open_positions_list = []
current_signal_dict = {}
last_regime = "unknown"
last_confidence = 0.0
last_strategies = []
last_reason = ""


def random_tick():
    global prices
    for s in NSE_SYMBOLS:
        change = random.uniform(-0.008, 0.008) + trends[s]
        prices[s] *= (1 + change)
        if random.random() < 0.05:
            trends[s] = random.uniform(-0.003, 0.003)


def generate_quotes():
    quotes = {}
    for s in NSE_SYMBOLS:
        p = prices[s]
        o = p * (1 + random.uniform(-0.005, 0.005))
        h = max(p, o) * (1 + random.uniform(0, 0.003))
        l = min(p, o) * (1 - random.uniform(0, 0.003))
        prev_c = p * (1 + random.uniform(-0.01, 0.01))
        chg = p - prev_c
        chg_pct = (chg / prev_c) * 100 if prev_c else 0
        vol = random.randint(100000, 5000000)
        quotes[s] = {
            "symbol": s,
            "last_price": round(p, 2),
            "open": round(o, 2),
            "high": round(h, 2),
            "low": round(l, 2),
            "close": round(prev_c, 2),
            "change": round(chg, 2),
            "change_percent": round(chg_pct, 2),
            "volume": vol,
            "is_live": False,
        }
    return quotes


def simulate_cycle():
    global cycle_count, signals_gen, signals_val, signals_rej
    global trades_appr, trades_risk, total_trades_val, winning_trades_val, losing_trades_val
    global realized_pnl_val, best_trade_val, worst_trade_val, current_balance
    global open_positions_list, current_signal_dict, last_regime, last_confidence
    global last_strategies, last_reason, activity

    cycle_count += 1
    random_tick()

    regime_idx = random.choices([0, 1, 2, 3], weights=[3, 2, 3, 1])[0]
    last_regime = REGIMES[regime_idx][0]
    last_confidence = round(random.uniform(0.4, 0.95), 2)
    last_strategies = random.sample(STRATEGIES_POOL, random.randint(1, 3))
    last_reason = f"Market showing {'bullish' if regime_idx == 0 else 'bearish' if regime_idx == 1 else 'sideways' if regime_idx == 2 else 'volatile'} signals with RSI at {random.randint(30, 70)} and volume analysis."

    # Generate some signals
    if random.random() < 0.7:
        sig_type = random.choice(["BUY", "SELL"])
        sym = random.choice(NSE_SYMBOLS)
        strat = random.choice(last_strategies)
        conf = round(random.uniform(0.5, 0.95), 2)
        signals_gen += 1
        current_signal_dict = {
            "signal_type": sig_type,
            "symbol": sym,
            "strategy": strat,
            "confidence": conf,
        }

        if random.random() < 0.6:
            signals_val += 1
            level = "SUCCESS"
            msg = f"VALIDATED: {sig_type} {sym} [{strat}]"
            if random.random() < 0.4:
                qty = random.randint(10, 100)
                entry = prices[sym]
                trades_appr += 1
                trade_msg = f"TRADE: {sig_type} {qty} {sym} @ Rs.{entry:,.2f}"
                activity.append({"time": datetime.now().strftime("%H:%M:%S"), "level": "TRADE", "message": trade_msg})
                open_positions_list.append({
                    "symbol": sym, "side": sig_type,
                    "qty": qty, "entry": round(entry, 2), "pnl": 0.0,
                })
        else:
            signals_rej += 1
            level = "WARNING"
            msg = f"REJECTED: {sig_type} {sym}"

        activity.append({"time": datetime.now().strftime("%H:%M:%S"), "level": level, "message": msg})

    # Close random positions
    if open_positions_list and random.random() < 0.25:
        pos = open_positions_list.pop(0)
        exit_p = prices[pos["symbol"]]
        pnl_mult = 1 if pos["side"] == "BUY" else -1
        pnl = (exit_p - pos["entry"]) * pos["qty"] * pnl_mult + random.uniform(-500, 500)
        total_trades_val += 1
        realized_pnl_val += pnl
        current_balance += pnl
        if pnl >= 0:
            winning_trades_val += 1
        else:
            losing_trades_val += 1
        best_trade_val = max(best_trade_val, round(pnl, 2))
        worst_trade_val = min(worst_trade_val, round(pnl, 2))
        activity.append({
            "time": datetime.now().strftime("%H:%M:%S"),
            "level": "TRADE",
            "message": f"EXIT: {pos['symbol']} P&L: Rs.{pnl:+,.2f}",
        })

    updates = {
        "trading_mode": "paper",
        "data_source": "simulated",
        "session_start": session_start,
        "current_balance": round(current_balance, 2),
        "starting_balance": 1000000.0,
        "realized_pnl": round(realized_pnl_val, 2),
        "unrealized_pnl": round(sum(p.get("pnl", 0) for p in open_positions_list), 2),
        "best_trade": best_trade_val,
        "worst_trade": worst_trade_val,
        "total_trades": total_trades_val,
        "winning_trades": winning_trades_val,
        "losing_trades": losing_trades_val,
        "current_regime": last_regime,
        "regime_confidence": last_confidence,
        "active_strategies": last_strategies,
        "cycles_run": cycle_count,
        "signals_generated": signals_gen,
        "signals_validated": signals_val,
        "signals_rejected": signals_rej,
        "trades_approved": trades_appr,
        "trades_risk_rejected": trades_risk,
        "market_quotes": generate_quotes(),
        "open_positions": open_positions_list.copy(),
        "current_signal": current_signal_dict,
        "last_decision_reason": last_reason,
        "activity_log": activity[-20:],
    }
    return updates


session_start = datetime.now().isoformat()
_sse_queues: list[asyncio.Queue] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    async def push_loop():
        while True:
            data = simulate_cycle()
            await asyncio.sleep(3)
            for q in _sse_queues:
                try:
                    q.put_nowait(data)
                except asyncio.QueueFull:
                    pass

    task = asyncio.create_task(push_loop())
    yield
    task.cancel()


app = FastAPI(lifespan=lifespan)


@app.get("/", response_class=HTMLResponse)
async def dashboard():
    html_path = TEMPLATES_DIR / "dashboard.html"
    if not html_path.exists():
        return HTMLResponse(f"<h1>Template not found at {html_path}</h1>", status_code=500)
    return HTMLResponse(html_path.read_text(encoding="utf-8"))


@app.get("/api/state")
async def api_state():
    return simulate_cycle()


@app.get("/api/events")
async def sse_events(request: Request):
    queue: asyncio.Queue = asyncio.Queue(maxsize=50)
    _sse_queues.append(queue)

    async def event_generator():
        try:
            yield {"event": "connected", "data": json.dumps({"status": "ok"})}
            yield {"event": "state", "data": json.dumps(simulate_cycle())}
            while True:
                if await request.is_disconnected():
                    break
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=30)
                    yield {"event": "state", "data": json.dumps(data)}
                except asyncio.TimeoutError:
                    yield {"event": "ping", "data": ""}
        finally:
            if queue in _sse_queues:
                _sse_queues.remove(queue)

    return EventSourceResponse(event_generator())


if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("  ASSETS Web Dashboard - Standalone Demo")
    print("  No API keys required - simulated data only")
    print(f"  Open: http://localhost:8000")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
