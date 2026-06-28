"""VAPI voice call integration service for ASSETS.

Provides voice call capabilities using the VAPI AI API for portfolio
discussions. Falls back gracefully when VAPI credentials are not configured.
"""
from __future__ import annotations

import uuid
import os
import json
import logging
from datetime import datetime, timezone
from typing import Any

import httpx

logger = logging.getLogger(__name__)

VAPI_BASE_URL = "https://api.vapi.ai"
VAPI_API_KEY = os.getenv("VAPI_API_KEY", "")
VAPI_ASSISTANT_ID = os.getenv("VAPI_ASSISTANT_ID", "93be6fbc-341f-4110-a0bb-23dc212d2263")


class VAPIService:
    """Service for managing voice calls via the VAPI AI API.

    Handles call initiation, status tracking, and ending calls.
    Supports portfolio context passing so the AI can discuss user portfolios.
    """

    def __init__(self) -> None:
        self._calls: dict[str, dict[str, Any]] = {}

    async def initiate_call(
        self,
        phone: str,
        user_id: str,
        portfolio_data: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Initiate a voice call to the given phone number with portfolio context.

        Makes a real API call to VAPI. Falls back to local simulation when
        VAPI_API_KEY is not set.

        Args:
            phone: The recipient's phone number (E.164 format recommended).
            user_id: The user's UUID.
            portfolio_data: Portfolio context dict with summary, holdings, etc.

        Returns:
            A dict with ``call_id``, ``status``, ``message``.
        """
        call_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        if VAPI_API_KEY:
            return await self._vapi_api_call(phone, user_id, portfolio_data, call_id)
        else:
            return self._local_fallback(phone, user_id, portfolio_data, call_id, now)

    async def _vapi_api_call(
        self,
        phone: str,
        user_id: str,
        portfolio_data: dict[str, Any] | None,
        call_id: str,
    ) -> dict[str, Any]:
        """Make the actual VAPI API call."""
        meta = (portfolio_data or {}).get("metadata", {})
        holdings_summary = self._build_holdings_summary(portfolio_data)

        payload = {
            "assistantId": VAPI_ASSISTANT_ID,
            "phoneNumber": {
                "type": "number",
                "number": phone,
                "numberE164CheckEnabled": True,
            },
            "assistantOverrides": {
                "variableValues": {
                    "user_name": meta.get("user_name", "Client"),
                    "portfolio_count": str(meta.get("portfolio_count", 0)),
                    "total_invested": str(meta.get("total_invested", 0)),
                    "ready_count": str(meta.get("ready_count", 0)),
                    "holdings_summary": holdings_summary,
                    "portfolio_ids": json.dumps(meta.get("portfolio_ids", [])),
                },
                "firstMessage": (
                    f"Hi {meta.get('user_name', 'there')}! I'm your ASSETS portfolio advisor. "
                    f"You have {meta.get('portfolio_count', 0)} portfolio(s) with a total investment of "
                    f"₹{meta.get('total_invested', 0):,}. "
                    f"I can help you understand your holdings, check performance, review risk, and more. "
                    f"What would you like to discuss?"
                ),
            },
            "metadata": {
                "user_id": user_id,
                "call_id": call_id,
                "source": "assets-portal",
            },
        }

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{VAPI_BASE_URL}/call",
                headers={
                    "Authorization": f"Bearer {VAPI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        if response.status_code >= 400:
            logger.error("VAPI API error: %s %s", response.status_code, response.text)
            raise RuntimeError(f"VAPI call failed: {response.text}")

        vapi_data = response.json()
        vapi_call_id = vapi_data.get("id", call_id)

        self._calls[vapi_call_id] = {
            "call_id": vapi_call_id,
            "phone": phone,
            "user_id": user_id,
            "portfolio_data": portfolio_data,
            "status": "initiated",
            "vapi_response": vapi_data,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        logger.info("VAPI call %s initiated for user %s", vapi_call_id, user_id)

        return {
            "call_id": vapi_call_id,
            "status": "initiated",
            "message": "Call has been queued. You will receive a call shortly.",
            "vapi_data": vapi_data,
        }

    def _local_fallback(
        self,
        phone: str,
        user_id: str,
        portfolio_data: dict[str, Any] | None,
        call_id: str,
        now: str,
    ) -> dict[str, Any]:
        """Local simulation when VAPI is not configured."""
        holdings_summary = self._build_holdings_summary(portfolio_data)

        self._calls[call_id] = {
            "call_id": call_id,
            "phone": phone,
            "user_id": user_id,
            "portfolio_data": portfolio_data or {},
            "context": holdings_summary,
            "status": "initiated",
            "created_at": now,
        }

        logger.info(
            "Local call %s for user %s to %s (VAPI not configured)",
            call_id, user_id, phone,
        )

        return {
            "call_id": call_id,
            "status": "initiated",
            "message": "Call has been queued. You will receive a call shortly.",
        }

    async def end_call(self, call_id: str) -> dict[str, str]:
        """End an active call via VAPI API or locally."""
        call = self._calls.get(call_id)
        if call is None:
            raise ValueError(f"Call {call_id} not found")

        if VAPI_API_KEY:
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    await client.post(
                        f"{VAPI_BASE_URL}/call/{call_id}/end",
                        headers={"Authorization": f"Bearer {VAPI_API_KEY}"},
                    )
            except Exception as e:
                logger.warning("Failed to end VAPI call %s: %s", call_id, e)

        call["status"] = "ended"
        call["ended_at"] = datetime.now(timezone.utc).isoformat()
        return {"call_id": call_id, "status": "ended"}

    async def get_call_status(self, call_id: str) -> dict[str, Any]:
        """Get the current status of a call."""
        call = self._calls.get(call_id)
        if call is None:
            raise ValueError(f"Call {call_id} not found")
        return dict(call)

    async def list_calls(self, user_id: str | None = None) -> list[dict[str, Any]]:
        """List all calls, optionally filtered by user_id."""
        calls = list(self._calls.values())
        if user_id:
            calls = [c for c in calls if c.get("user_id") == user_id]
        calls.sort(key=lambda c: c.get("created_at", ""), reverse=True)
        return calls

    @staticmethod
    def _build_holdings_summary(portfolio_data: dict[str, Any] | None) -> str:
        """Build a text summary of portfolio holdings for the AI context."""
        if not portfolio_data:
            return "No portfolio data available."

        meta = portfolio_data.get("metadata", {})
        parts = [
            f"Client: {meta.get('user_name', 'Unknown')}",
            f"Portfolios: {meta.get('portfolio_count', 0)}",
            f"Total invested: ₹{meta.get('total_invested', 0):,}",
        ]

        if meta.get("ready_count"):
            parts.append(f"Active portfolios: {meta['ready_count']}")

        return ". ".join(parts)


vapi_service = VAPIService()