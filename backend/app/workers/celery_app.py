"""Celery application instance for ASSETS workers.

This module is the canonical location of the Celery app.
``app.celery_app`` (the legacy module at the app root) re-exports from here
so existing imports continue to work.

Start a worker from the ``backend/`` directory::

    # Linux/macOS (prefork, production)
    celery -A app.workers.celery_app worker --loglevel=info --concurrency=4

    # Windows (solo pool — no fork())
    celery -A app.workers.celery_app worker --loglevel=info --pool=solo

    # Docker (see docker-compose.yml)
    command: celery -A app.workers.celery_app worker --loglevel=info --concurrency=4
"""
from __future__ import annotations

from celery import Celery

from app.core.config import settings

celery: Celery = Celery(
    "assets",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.tasks"],
)

celery.conf.update(
    # Serialisation
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],

    # Reliability
    task_acks_late=True,           # ack after the task completes, not before
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,  # one task at a time per worker slot

    # Results TTL — keep for 24 h so /status can still read them
    result_expires=86400,

    # Timezone
    timezone="Asia/Kolkata",
    enable_utc=True,

    # Routing
    task_routes={
        "assets.run_full_analysis": {"queue": "analysis"},
        "assets.ping":              {"queue": "default"},
    },
    task_default_queue="default",
)
