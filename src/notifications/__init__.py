"""
Notifications module for ASSETS.
"""

from .telegram import TelegramNotifier, get_notifier

__all__ = ["TelegramNotifier", "get_notifier"]
