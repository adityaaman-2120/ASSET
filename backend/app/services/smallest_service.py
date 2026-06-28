"""Smallest.ai (Atoms) service — mints short-lived web-call tokens server-side."""
from __future__ import annotations

from smallestai import AsyncSmallestAI

from app.core.config import settings


class SmallestService:
    @property
    def is_configured(self) -> bool:
        return bool(settings.SMALLEST_API_KEY and settings.SMALLEST_AGENT_ID)

    async def create_web_call(self, mode: str = "webcall") -> dict:
        if not self.is_configured:
            raise ValueError(
                "Voice agent is not configured. "
                "Set SMALLEST_API_KEY and SMALLEST_AGENT_ID in the backend .env."
            )

        client = AsyncSmallestAI(api_key=settings.SMALLEST_API_KEY)
        agent_id = settings.SMALLEST_AGENT_ID

        # Find the currently active published version
        versions_resp = await client.atoms.agent_versioning_versions.list_published_versions(
            id=agent_id, limit=20
        )
        versions = versions_resp.data.versions if versions_resp.data else []
        active = next((v for v in versions if v.is_active), None)
        if active is None:
            # Fallback: use the most recently published version
            active = versions[0] if versions else None
        if active is None:
            raise RuntimeError("No published versions found for the configured Atoms agent.")

        # Mint a web-call token for the active version
        result = await client.atoms.agent_versioning_versions.test_call_with_version_config(
            id=agent_id,
            version_id=active.id,
            mode=mode,
        )

        return {
            "token": result.data.token,
            "host": result.data.host,
            "agent_id": agent_id,
        }


smallest_service = SmallestService()
