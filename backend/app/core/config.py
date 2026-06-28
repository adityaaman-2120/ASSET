"""Application settings for ASSETS.

Configuration is loaded from the ``.env`` file in the backend root using
python-dotenv (one of the project dependencies), so no extra packages are
required.
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# backend/app/core/config.py -> parents[2] == backend/
BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")


class Settings:
    PROJECT_NAME: str = "ASSETS"
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
    )

    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    VAPI_API_KEY: str = os.getenv("VAPI_API_KEY", "")
    VAPI_ASSISTANT_ID: str = os.getenv("VAPI_ASSISTANT_ID", "93be6fbc-341f-4110-a0bb-23dc212d2263")

    @property
    def CORS_ORIGINS(self) -> list[str]:
        raw = os.getenv("CORS_ORIGINS", "http://localhost:3000")
        return [origin.strip() for origin in raw.split(",") if origin.strip()]


settings = Settings()
