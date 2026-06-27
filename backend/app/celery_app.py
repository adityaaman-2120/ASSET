"""Backward-compatibility shim.

All Celery infrastructure has been moved to ``app.workers``.
This module re-exports the canonical objects so existing import paths
(e.g. ``from app.celery_app import run_full_analysis``) continue to work.
"""
from __future__ import annotations

from app.workers.celery_app import celery  # noqa: F401  re-export
from app.workers.tasks import ping, run_full_analysis  # noqa: F401  re-export

__all__ = ["celery", "ping", "run_full_analysis"]
