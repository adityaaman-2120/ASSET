"""
ASSETS Web Dashboard
Runs the trading engine + web UI simultaneously.
"""

import asyncio
import logging
import sys
import threading
import time
from datetime import datetime
from pathlib import Path

import uvicorn

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.config import get_settings
from src.agents.graph import create_trading_graph, run_trading_cycle
from src.market.manager import MarketDataManager, is_market_open
from src.market.history_manager import HistoryManager
from src.market.indicators import calculate_indicators, Timeframe
from src.market.signals import SignalEngine
from src.market.stock_discovery import StockDiscovery
from src.memory.database import AgentMemoryDB
from src.execution.paper_engine import LocalPaperEngine
from src.execution.exit_manager import ExitManager
from src.web.server import app, update_state, get_state

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("web_dashboard")


def calculate_real_indicators(history_manager, symbol):
    df = history_manager.get_history(symbol, bars=200)
    if df is None or len(df) < 26:
        return None
    try:
        return calculate_indicators(df, symbol, timeframe=Timeframe.D1)
    except Exception as e:
        logger.warning(f"Indicator calc failed for {symbol}: {e}")
        return None


async def run_trading_loop():
    settings = get_settings()
    data_source = "live" if is_market_open() else "simulated"
    trading_mode = settings.trading_mode

    await update_state({
        "trading_mode": trading_mode,
        "data_source": data_source,
        "starting_balance": settings.paper_wallet_balance,
        "current_balance": settings.paper_wallet_balance,
    })

    graph = create_trading_graph(include_support_agents=settings.enable_news_analysis)
    logger.info("Trading graph compiled")

    memory_db = AgentMemoryDB()
    paper_engine = LocalPaperEngine(initial_balance=settings.paper_wallet_balance)
    exit_manager = ExitManager(
        trailing_atr_multiplier=1.5,
        breakeven_r_threshold=1.0,
        max_hold_minutes=240,
        partial_profit_r=1.0,
        partial_exit_pct=0.5,
    )
    signal_engine = SignalEngine()

    discovery = StockDiscovery(max_stocks=15)
    trading_symbols = await discovery.discover()
    await update_state({"activity_log": [
        {"time": datetime.now().strftime("%H:%M:%S"), "level": "INFO", "message": f"Discovered {len(trading_symbols)} stocks"}
    ]})

    history_manager = HistoryManager(symbols=trading_symbols, lookback_period="3mo")
    fetch_results = history_manager.prefetch_all()
    loaded = sum(1 for v in fetch_results.values() if v)
    logger.info(f"Historical data loaded: {loaded}/{len(trading_symbols)} symbols")

    market_manager = MarketDataManager(symbols=trading_symbols)
    is_live = await market_manager.start()
    logger.info(f"Market data: {'LIVE' if is_live else 'SIMULATED'}")

    await update_state({
        "data_source": "live" if is_live else "simulated",
    })

    activity = []
    cycle = 0

    while True:
        cycle += 1
        logger.info(f"=== Trading Cycle #{cycle} ===")

        activity.append({
            "time": datetime.now().strftime("%H:%M:%S"),
            "level": "INFO",
            "message": f"Cycle #{cycle} started",
        })

        # Refresh data
        if not is_live:
            market_manager.refresh_simulated()

        quotes = market_manager.get_all_quotes()
        market_prices = {s: q.last_price for s, q in quotes.items()}

        await update_state({
            "market_quotes": {s: q.to_dict() for s, q in quotes.items()},
            "activity_log": activity,
        })

        # Update history
        for symbol, quote in quotes.items():
            history_manager.append_quote(
                symbol=symbol,
                open_price=quote.open, high=quote.high,
                low=quote.low, close=quote.last_price,
                volume=quote.volume,
            )

        # Find candidates
        candidates = market_manager.get_trading_candidates(min_change=0.3)
        if not candidates:
            activity.append({
                "time": datetime.now().strftime("%H:%M:%S"),
                "level": "INFO",
                "message": "No trading candidates found",
            })
            await update_state({"activity_log": activity})
            await asyncio.sleep(20)
            continue

        top = candidates[0]
        indicators = calculate_real_indicators(history_manager, top.symbol)
        if indicators is None:
            activity.append({
                "time": datetime.now().strftime("%H:%M:%S"),
                "level": "WARNING",
                "message": f"Insufficient history for {top.symbol}",
            })
            await update_state({"activity_log": activity})
            await asyncio.sleep(15)
            continue

        signals = signal_engine.generate_signals(indicators)
        if signals:
            sig = signals[0]
            await update_state({
                "current_signal": {
                    "signal_type": sig.signal_type.value,
                    "symbol": sig.symbol,
                    "strategy": sig.strategy.value,
                    "confidence": sig.confidence,
                },
            })

        await update_state({"signals_generated": get_state()["signals_generated"] + len(signals)})

        if not signals:
            activity.append({
                "time": datetime.now().strftime("%H:%M:%S"),
                "level": "INFO",
                "message": "No signals generated",
            })
            await update_state({"activity_log": activity})
            await asyncio.sleep(20)
            continue

        # Run agent pipeline
        market_data_dict = {s: q.to_dict() for s, q in quotes.items()}
        indicators_dict = {top.symbol: indicators.to_dict()}

        memory_lessons = memory_db.get_top_lessons_for_context(
            regime="trending_up" if top.is_bullish else "trending_down",
            strategies=["momentum", "trend_following"],
            n=5,
        )

        workflow_id = f"WEB-{datetime.now().strftime('%Y%m%d%H%M%S')}-{cycle}"

        final_state = await run_trading_cycle(
            graph=graph,
            market_data=market_data_dict,
            indicators=indicators_dict,
            signals=[s.to_dict() for s in signals],
            memory_lessons=memory_lessons,
            portfolio={
                "capital": paper_engine.get_balance(),
                "positions": [p.to_dict() for p in paper_engine.get_positions()],
            },
            daily_stats={
                "trades_count": get_state()["total_trades"],
                "profit_loss": get_state()["realized_pnl"],
                "max_drawdown": 0,
            },
            thread_id=workflow_id,
        )

        regime = final_state.get("regime", "unknown")
        confidence = final_state.get("regime_confidence", 0)
        strategies = final_state.get("active_strategies", [])

        validated = final_state.get("validated_signals", [])
        rejected = final_state.get("rejected_signals", [])

        await update_state({
            "current_regime": regime,
            "regime_confidence": confidence,
            "active_strategies": strategies,
            "signals_validated": get_state()["signals_validated"] + len(validated),
            "signals_rejected": get_state()["signals_rejected"] + len(rejected),
        })

        for sig in validated:
            activity.append({
                "time": datetime.now().strftime("%H:%M:%S"),
                "level": "SUCCESS",
                "message": f"VALIDATED: {sig.get('signal_type')} {sig.get('symbol')}",
            })
        for sig in rejected:
            activity.append({
                "time": datetime.now().strftime("%H:%M:%S"),
                "level": "WARNING",
                "message": f"REJECTED: {sig.get('signal_type')} {sig.get('symbol')}",
            })

        # Execute trades
        approved = final_state.get("approved_trades", [])
        risk_rejected = final_state.get("risk_rejected", [])

        await update_state({
            "trades_approved": get_state()["trades_approved"] + len(approved),
            "trades_risk_rejected": get_state()["trades_risk_rejected"] + len(risk_rejected),
            "last_decision_reason": final_state.get("regime_reasoning", ""),
        })

        for trade in approved:
            symbol = trade.get("symbol", "N/A")
            side = trade.get("signal_type", "BUY")
            entry_price = market_prices.get(symbol, trade.get("entry_price", 0))
            stop_loss = trade.get("stop_loss", entry_price * 0.98)
            target_price = trade.get("target_price", entry_price * 1.04)
            strategy = trade.get("strategy", "unknown")
            quantity = max(1, int((paper_engine.get_balance() * 0.05) / entry_price)) if entry_price > 0 else 1

            order = paper_engine.place_order(
                symbol=symbol, side=side,
                quantity=quantity, current_price=entry_price,
            )

            if order.status == "FILLED":
                activity.append({
                    "time": datetime.now().strftime("%H:%M:%S"),
                    "level": "TRADE",
                    "message": f"TRADE: {side} {quantity} {symbol} @ Rs.{entry_price:,.2f}",
                })

                positions = get_state()["open_positions"]
                positions.append({
                    "symbol": symbol, "side": side,
                    "qty": quantity, "entry": entry_price, "pnl": 0.0,
                })

                exit_manager.register_position(
                    position_id=order.order_id,
                    symbol=symbol, side=side, quantity=quantity,
                    entry_price=entry_price, stop_loss=stop_loss,
                    target_price=target_price, strategy=strategy,
                    regime=regime,
                )

        # Check exits
        atr_values = {}
        for sym in market_prices:
            ind = calculate_real_indicators(history_manager, sym)
            if ind and ind.atr:
                atr_values[sym] = ind.atr

        exit_signals = exit_manager.check_exits(market_prices, regime, atr_values)
        for pos, exit_rule in exit_signals:
            exit_price = market_prices.get(pos.symbol, pos.entry_price)
            order = paper_engine.place_order(
                symbol=pos.symbol, side="SELL" if pos.side == "BUY" else "BUY",
                quantity=int(pos.quantity * exit_rule.partial_pct),
                current_price=exit_price,
            )
            if order.status == "FILLED":
                pnl = (exit_price - pos.entry_price) * pos.quantity * exit_rule.partial_pct
                if pos.side != "BUY":
                    pnl = -pnl

                total_trades = get_state()["total_trades"] + 1
                realized_pnl = get_state()["realized_pnl"] + pnl
                current_balance = get_state()["current_balance"] + pnl

                await update_state({
                    "total_trades": total_trades,
                    "realized_pnl": realized_pnl,
                    "current_balance": current_balance,
                    "winning_trades": get_state()["winning_trades"] + (1 if pnl >= 0 else 0),
                    "losing_trades": get_state()["losing_trades"] + (1 if pnl < 0 else 0),
                    "best_trade": max(get_state()["best_trade"], pnl),
                    "worst_trade": min(get_state()["worst_trade"], pnl),
                })

                activity.append({
                    "time": datetime.now().strftime("%H:%M:%S"),
                    "level": "TRADE",
                    "message": f"EXIT [{exit_rule.exit_type}]: {pos.symbol} @ Rs.{exit_price:,.2f} P&L: Rs.{pnl:+,.2f}",
                })

                if exit_rule.partial_pct >= 1.0:
                    exit_manager.unregister_position(pos.position_id)

        # Update positions P&L
        paper_engine.update_positions_pnl(market_prices)
        await update_state({
            "current_balance": paper_engine.get_balance(),
            "open_positions": [
                {"symbol": p.symbol, "side": p.side, "qty": p.quantity, "entry": p.entry_price, "pnl": p.unrealized_pnl}
                for p in paper_engine.get_positions()
            ],
            "cycles_run": get_state()["cycles_run"] + 1,
            "activity_log": activity,
        })

        await asyncio.sleep(20)


def run_web_server():
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")


async def main():
    server_thread = threading.Thread(target=run_web_server, daemon=True)
    server_thread.start()
    logger.info("Web server started on http://localhost:8000")

    await run_trading_loop()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        sys.exit(0)
