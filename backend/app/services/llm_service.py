"""LLM service for ASSETS, backed by Groq (Llama 3.3 70B).

Responsibilities:
- Extract a structured investment brief from free-text goals.
- Compile brief constraints into concrete optimizer rules (pure logic).
- Produce a "devil's advocate" risk critique of a portfolio.
- Answer natural-language what-if questions about a portfolio.

All Groq calls are async, retried with exponential backoff, and cached in Redis
(TTL 1h) keyed by a hash of the request. Redis is optional: if it's unreachable
the service simply skips caching rather than failing.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import os
import random
from typing import Any

import groq
from groq import AsyncGroq

from app.core.config import settings

DEFAULT_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# Transient failures worth retrying. Auth / bad-request / not-found are not.
_RETRYABLE = (
    groq.RateLimitError,
    groq.APIConnectionError,
    groq.APITimeoutError,
    groq.InternalServerError,
)

_EXTRACT_SYSTEM = """You are a financial analyst. Extract from the user's \
natural language investment goal.
Return ONLY valid JSON with this exact shape:
{
  "amount": float,
  "risk_level": "low" | "medium" | "high",
  "horizon_years": int,
  "constraints": {
    "excluded_sectors": [string],
    "min_dividend": float or null,
    "esg_only": boolean,
    "preferred_sectors": [string]
  },
  "raw_intent": string
}
Rules:
- Parse Indian notations: "1L"/"1 lakh" = 100000, "1Cr"/"1 crore" = 10000000.
- Map phrases to sectors, e.g. "no fossil fuels" -> ["energy", "oil_gas", "coal"],
  "no tobacco" -> ["tobacco"], "avoid defense" -> ["defense"].
- Use lowercase snake_case sector names.
- If a field is unknown, use sensible defaults (medium risk, horizon 3).
- raw_intent is a one-sentence paraphrase of the user's goal."""

_CRITIQUE_SYSTEM = """You are a skeptical, experienced risk manager. Given a \
proposed portfolio and its return predictions, identify the 3 most important \
risks a naive investor would overlook (concentration, correlation, regime \
sensitivity, liquidity, over-reliance on model confidence, etc.).
Return ONLY valid JSON with this exact shape:
{
  "warnings": [string, string, string],
  "rationale": string,
  "risk_score": integer between 1 and 10
}
Be specific and reference the actual tickers/weights/numbers provided."""

_WHATIF_SYSTEM = """You are a portfolio advisor for the ASSETS platform. Answer \
the user's question about THEIR portfolio in plain, concise English (2-4 \
sentences). Use only the portfolio data provided; cite specific weights and \
numbers. If the data does not contain the answer, say so honestly. Do not give \
generic disclaimers."""

_RISK_RULES = {
    "low": {"max_weight": 0.10, "min_stocks": 15},
    "medium": {"max_weight": 0.15, "min_stocks": 10},
    "high": {"max_weight": 0.25, "min_stocks": 6},
}

_ESG_EXCLUSIONS = ["oil_gas", "energy", "coal", "tobacco", "defense", "gambling"]


class LLMService:
    MODEL = DEFAULT_MODEL
    CACHE_TTL = 3600  # 1 hour
    MAX_RETRIES = 3

    def __init__(self, api_key: str | None = None, redis_url: str | None = None):
        self._api_key = api_key or settings.GROQ_API_KEY
        self._client = AsyncGroq(api_key=self._api_key) if self._api_key else None
        self._redis_url = redis_url or settings.REDIS_URL
        self._redis: Any = None  # None=unattempted, False=unavailable, else client

    # ------------------------------------------------------------------ #
    # Redis cache (optional / best-effort)
    # ------------------------------------------------------------------ #
    async def _get_redis(self):
        if self._redis is None:
            try:
                import redis.asyncio as aioredis

                client = aioredis.from_url(self._redis_url, decode_responses=True)
                await client.ping()
                self._redis = client
            except Exception:
                self._redis = False
        return self._redis or None

    @staticmethod
    def _cache_key(namespace: str, payload: Any) -> str:
        raw = json.dumps(payload, sort_keys=True, default=str)
        digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
        return f"llm:{namespace}:{digest}"

    async def _cache_get(self, key: str):
        r = await self._get_redis()
        if not r:
            return None
        try:
            value = await r.get(key)
            return json.loads(value) if value is not None else None
        except Exception:
            return None

    async def _cache_set(self, key: str, value: Any) -> None:
        r = await self._get_redis()
        if not r:
            return
        try:
            await r.set(key, json.dumps(value, default=str), ex=self.CACHE_TTL)
        except Exception:
            pass

    # ------------------------------------------------------------------ #
    # Groq chat with retry
    # ------------------------------------------------------------------ #
    async def _chat(
        self,
        system: str,
        user: str,
        *,
        json_mode: bool = False,
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> str:
        if self._client is None:
            raise RuntimeError("GROQ_API_KEY is not configured.")

        kwargs: dict[str, Any] = {
            "model": self.MODEL,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        last_exc: Exception | None = None
        for attempt in range(self.MAX_RETRIES):
            try:
                resp = await self._client.chat.completions.create(**kwargs)
                return resp.choices[0].message.content or ""
            except _RETRYABLE as exc:
                last_exc = exc
                if attempt == self.MAX_RETRIES - 1:
                    break
                # Exponential backoff with jitter: ~1s, 2s, 4s.
                await asyncio.sleep(2 ** attempt + random.uniform(0, 0.5))
            except groq.APIStatusError as exc:
                # Retry server errors only; surface client errors immediately.
                if exc.status_code >= 500 and attempt < self.MAX_RETRIES - 1:
                    last_exc = exc
                    await asyncio.sleep(2 ** attempt + random.uniform(0, 0.5))
                    continue
                raise
        assert last_exc is not None
        raise last_exc

    @staticmethod
    def _parse_json(text: str) -> dict:
        text = text.strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.lower().startswith("json"):
                text = text[4:]
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            start, end = text.find("{"), text.rfind("}")
            if start != -1 and end != -1 and end > start:
                return json.loads(text[start : end + 1])
            raise

    # ------------------------------------------------------------------ #
    # 1. Investment brief extraction
    # ------------------------------------------------------------------ #
    async def extract_investment_brief(self, goal_text: str) -> dict:
        cache_key = self._cache_key("brief", goal_text.strip().lower())
        cached = await self._cache_get(cache_key)
        if cached is not None:
            return cached

        raw = await self._chat(
            _EXTRACT_SYSTEM, goal_text, json_mode=True, temperature=0.1
        )
        brief = self._normalize_brief(self._parse_json(raw), goal_text)
        await self._cache_set(cache_key, brief)
        return brief

    @staticmethod
    def _coerce_float(value, default: float = 0.0) -> float:
        try:
            if isinstance(value, str):
                value = value.replace(",", "").replace("₹", "").strip()
            return float(value)
        except (TypeError, ValueError):
            return default

    def _normalize_brief(self, data: dict, goal_text: str) -> dict:
        risk = str(data.get("risk_level", "medium")).lower()
        if risk not in {"low", "medium", "high"}:
            risk = "medium"

        cons = data.get("constraints") or {}
        constraints = {
            "excluded_sectors": [
                str(s).lower() for s in (cons.get("excluded_sectors") or [])
            ],
            "min_dividend": (
                self._coerce_float(cons.get("min_dividend"))
                if cons.get("min_dividend") not in (None, "")
                else None
            ),
            "esg_only": bool(cons.get("esg_only", False)),
            "preferred_sectors": [
                str(s).lower() for s in (cons.get("preferred_sectors") or [])
            ],
        }

        try:
            horizon = int(round(self._coerce_float(data.get("horizon_years"), 3)))
        except (TypeError, ValueError):
            horizon = 3
        horizon = max(1, horizon)

        return {
            "amount": self._coerce_float(data.get("amount"), 0.0),
            "risk_level": risk,
            "horizon_years": horizon,
            "constraints": constraints,
            "raw_intent": str(data.get("raw_intent") or goal_text).strip(),
        }

    # ------------------------------------------------------------------ #
    # 2. Constraint compilation (pure logic, no LLM)
    # ------------------------------------------------------------------ #
    def compile_constraints(self, brief: dict) -> dict:
        risk = brief.get("risk_level", "medium")
        rule = _RISK_RULES.get(risk, _RISK_RULES["medium"])
        cons = brief.get("constraints") or {}

        excluded = [str(s).lower() for s in (cons.get("excluded_sectors") or [])]
        if cons.get("esg_only"):
            for s in _ESG_EXCLUSIONS:
                if s not in excluded:
                    excluded.append(s)

        # Hard-zero caps for excluded sectors (the optimizer also filters these).
        sector_caps = {s: 0.0 for s in excluded}

        return {
            "max_weight": rule["max_weight"],
            "min_stocks": rule["min_stocks"],
            "excluded_sectors": excluded,
            "sector_caps": sector_caps,
        }

    # ------------------------------------------------------------------ #
    # 3. Devil's advocate critique
    # ------------------------------------------------------------------ #
    async def devils_advocate_critique(self, portfolio: dict, predictions: dict) -> dict:
        pred_summary = self._summarize_predictions(predictions)
        payload = {"portfolio": portfolio, "predictions": pred_summary}
        cache_key = self._cache_key("critique", payload)
        cached = await self._cache_get(cache_key)
        if cached is not None:
            return cached

        user = (
            "Portfolio:\n"
            + json.dumps(portfolio, default=str, indent=2)
            + "\n\nReturn predictions per ticker:\n"
            + json.dumps(pred_summary, default=str, indent=2)
        )
        raw = await self._chat(_CRITIQUE_SYSTEM, user, json_mode=True, temperature=0.4)
        result = self._normalize_critique(self._parse_json(raw))
        await self._cache_set(cache_key, result)
        return result

    @staticmethod
    def _summarize_predictions(predictions: dict) -> dict:
        """Keep only JSON-safe scalar fields (drops model objects / DataFrames)."""
        summary: dict = {}
        for ticker, p in (predictions or {}).items():
            if not isinstance(p, dict):
                continue
            summary[ticker] = {
                k: p.get(k)
                for k in (
                    "predicted_return",
                    "confidence",
                    "sharpe_estimate",
                    "max_drawdown_estimate",
                    "volatility",
                    "sector",
                )
                if k in p
            }
        return summary

    @staticmethod
    def _normalize_critique(data: dict) -> dict:
        warnings = data.get("warnings") or []
        if isinstance(warnings, str):
            warnings = [warnings]
        warnings = [str(w) for w in warnings][:5]

        try:
            score = int(round(float(data.get("risk_score", 5))))
        except (TypeError, ValueError):
            score = 5
        score = max(1, min(10, score))

        return {
            "warnings": warnings,
            "rationale": str(data.get("rationale", "")).strip(),
            "risk_score": score,
        }

    # ------------------------------------------------------------------ #
    # 4. What-if Q&A
    # ------------------------------------------------------------------ #
    async def answer_what_if(self, portfolio: dict, question: str) -> str:
        payload = {"portfolio": portfolio, "question": question.strip()}
        cache_key = self._cache_key("whatif", payload)
        cached = await self._cache_get(cache_key)
        if cached is not None:
            return cached

        user = (
            "My portfolio:\n"
            + json.dumps(portfolio, default=str, indent=2)
            + f"\n\nQuestion: {question}"
        )
        answer = (await self._chat(_WHATIF_SYSTEM, user, temperature=0.5)).strip()
        await self._cache_set(cache_key, answer)
        return answer


# Module-level singleton for the API/orchestration layer.
llm_service = LLMService()
