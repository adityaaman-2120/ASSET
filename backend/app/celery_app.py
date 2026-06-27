"""Celery application for ASSETS background tasks.

Start a worker (with Redis running) from the backend/ directory:
    celery -A app.celery_app.celery worker --loglevel=info --pool=solo

The --pool=solo flag is recommended on Windows.
"""
from __future__ import annotations

from celery import Celery

from app.core.config import settings

celery = Celery(
    "assets",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
)


@celery.task(name="assets.ping")
def ping() -> str:
    """Trivial task to verify the worker is wired up."""
    return "pong from ASSETS"


@celery.task(bind=True, name="assets.run_full_analysis")
def run_full_analysis(self, portfolio_id: str) -> None:
    """Trigger the full async analysis pipeline."""
    import asyncio
    from app.services.analysis_pipeline import run_full_analysis_async
    asyncio.run(run_full_analysis_async(portfolio_id, task_id=self.request.id))

