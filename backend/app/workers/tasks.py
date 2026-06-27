"""Celery tasks for ASSETS.

Each task is bound (``bind=True``) so it can call ``self.update_state()``
to push granular progress updates into the Celery result backend. The API's
``GET /analysis/status/{portfolio_id}`` endpoint merges these task-level
progress values with the DB row to give the frontend a unified progress number.

Stage map
---------
  5%  – DB fetch & constraint extraction
 10%  – Universe screening (Nifty 500 filtered by excluded sectors)
 30%  – Parallel OHLCV fetch + indicator computation (20 workers)
 60%  – XGBoost return predictions per ticker
 75%  – Mean-variance portfolio optimisation
 85%  – Historical stress testing
 90%  – SHAP explanations
 95%  – LLM Devil's Advocate critique
100%  – Persist to DB, mark status = ready
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from celery import Task
from celery.utils.log import get_task_logger

from app.workers.celery_app import celery
from app.core.config import settings

logger: logging.Logger = get_task_logger(__name__)


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _run(coro):
    """Run a coroutine synchronously inside a Celery worker process."""
    return asyncio.run(coro)


def _set_progress(task: Task, pct: int, stage: str) -> None:
    """Push progress state to Celery result backend and log it."""
    task.update_state(
        state="PROGRESS",
        meta={"progress": pct, "stage": stage},
    )
    logger.info("[%s] progress=%d%% — %s", task.request.id, pct, stage)


def _persist_progress(portfolio_id: str, pct: int, status_value: str = "processing") -> None:
    """Write progress to the DB so non-Celery polling also works."""
    from app.db.session import get_sync_engine
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import Session

    # Use a raw synchronous connection to avoid async complexity in a worker thread.
    try:
        url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
        engine = create_engine(url, pool_pre_ping=True)
        with Session(engine) as session:
            session.execute(
                text(
                    "UPDATE portfolios SET progress = :p, status = :s "
                    "WHERE id = :id"
                ),
                {"p": max(pct, 0), "s": status_value, "id": uuid.UUID(portfolio_id)},
            )
            session.commit()
        engine.dispose()
    except Exception as exc:  # noqa: BLE001
        logger.warning("DB progress update failed (non-fatal): %s", exc)


# ─── Main task ────────────────────────────────────────────────────────────────

@celery.task(
    bind=True,
    name="assets.run_full_analysis",
    max_retries=0,
    throws=(),
    acks_late=True,
)
def run_full_analysis(self: Task, portfolio_id: str) -> dict[str, Any]:
    """Full quant analysis pipeline — 8 stages, 0→100% progress.

    The pipeline is implemented in :mod:`app.services.analysis_pipeline` as
    a fully-async function. We delegate to it here via ``asyncio.run`` after
    handling the Celery-specific progress bookkeeping.
    """
    logger.info("Starting full analysis for portfolio %s", portfolio_id)

    # ── Stage 1 (5%): Bootstrap ──────────────────────────────────────────────
    _set_progress(self, 5, "Fetching portfolio from DB…")
    _persist_progress(portfolio_id, 5)

    try:
        # ── Delegate to the async pipeline ───────────────────────────────────
        # The pipeline already updates progress in the DB at each step.
        # We wrap it with a progress-hook so Celery state is also updated.
        _run(_pipeline_with_hooks(self, portfolio_id))

        logger.info("Analysis complete for portfolio %s", portfolio_id)
        return {"portfolio_id": portfolio_id, "status": "ready"}

    except Exception as exc:
        logger.exception("Analysis failed for portfolio %s: %s", portfolio_id, exc)
        # Mark DB row as failed
        _persist_progress(portfolio_id, 0, "pending")
        try:
            from app.db.session import get_sync_engine  # noqa: F401
            from sqlalchemy import create_engine, text
            from sqlalchemy.orm import Session

            url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
            engine = create_engine(url, pool_pre_ping=True)
            with Session(engine) as session:
                session.execute(
                    text(
                        "UPDATE portfolios "
                        "SET status = 'pending', progress = 0, "
                        "    results = jsonb_set(COALESCE(results, '{}'), '{error}', to_jsonb(:err::text)) "
                        "WHERE id = :id"
                    ),
                    {"err": str(exc), "id": uuid.UUID(portfolio_id)},
                )
                session.commit()
            engine.dispose()
        except Exception:  # noqa: BLE001
            pass
        # Re-raise so Celery marks the task FAILURE
        raise


async def _pipeline_with_hooks(task: Task, portfolio_id: str) -> None:
    """Run the async pipeline and push Celery progress updates at each stage.

    We monkey-patch the pipeline's ``_set_progress`` helper to also call
    ``task.update_state`` so both Celery backend and DB are kept in sync.
    """
    import app.services.analysis_pipeline as pipeline_module

    # Save the original helper
    _original = pipeline_module._set_progress

    async def _hooked(Session, pid, pct: int) -> None:  # noqa: N803
        await _original(Session, pid, pct)
        stage = _progress_to_stage(pct)
        task.update_state(
            state="PROGRESS",
            meta={"progress": pct, "stage": stage},
        )

    # Patch and run
    pipeline_module._set_progress = _hooked
    try:
        from app.services.analysis_pipeline import run_full_analysis_async
        await run_full_analysis_async(portfolio_id, task_id=task.request.id)
    finally:
        pipeline_module._set_progress = _original


def _progress_to_stage(pct: int) -> str:
    """Map a progress percentage to a human-readable stage label."""
    if pct <= 5:
        return "Fetching portfolio & constraints…"
    if pct <= 15:
        return "Screening Nifty universe…"
    if pct <= 65:
        return "Downloading OHLCV & computing indicators…"
    if pct <= 75:
        return "Running XGBoost return predictions…"
    if pct <= 82:
        return "Solving mean-variance optimizer…"
    if pct <= 88:
        return "Running historical stress tests…"
    if pct <= 92:
        return "Generating SHAP explanations…"
    if pct <= 96:
        return "Running LLM Devil's Advocate critique…"
    return "Persisting results to database…"


# ─── Health-check task ────────────────────────────────────────────────────────

@celery.task(name="assets.ping")
def ping() -> str:
    """Trivial liveness check task."""
    return "pong from ASSETS"
