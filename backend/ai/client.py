"""
Module: backend.ai.client
Responsibility: Thin async wrapper around OpenAI SDK.

Architectural Boundaries:
- This is the ONLY file that imports from openai.
- No LangChain, no LangGraph, no agents, no RAG.
- Direct SDK usage only — simple, auditable, replaceable.
- Model is configurable via settings — swap GPT-4o for any future model with zero code changes.
"""

import logging
import os
from typing import Optional

from core.config import get_settings

logger = logging.getLogger(__name__)


class OpenAIClient:
    """
    Minimal async client for editorial narrative synthesis calls.
    Instantiated lazily — avoids import errors when API key is absent.
    """

    PROMPT_VERSION = "1.0.0"  # Bump this when the system prompt changes to force narrative regeneration

    def __init__(self) -> None:
        self._client = None
        self._settings = get_settings()

    def _get_client(self):
        """Lazily initialize the AsyncOpenAI client."""
        if self._client is None:
            try:
                from openai import AsyncOpenAI
                kwargs = {"api_key": self._settings.openai_api_key}
                base_url = self._settings.openai_base_url or os.getenv("OPENAI_BASE_URL")
                if base_url:
                    kwargs["base_url"] = base_url
                self._client = AsyncOpenAI(**kwargs)
            except ImportError:
                logger.error("openai package not installed")
                return None
        return self._client

    async def synthesize(self, system_prompt: str, user_message: str) -> Optional[str]:
        """
        Call the LLM with a system prompt and user message.
        Returns the generated text or None on any failure.

        Settings:
          temperature=0.4  — restrained but not robotic
          top_p=0.9        — focused vocabulary
          max_tokens=120   — enforces 2-sentence conciseness
        """
        if not self._settings.openai_api_key:
            logger.debug("AI narrative synthesis skipped: OPENAI_API_KEY not configured")
            return None

        client = self._get_client()
        if client is None:
            return None

        try:
            response = await client.chat.completions.create(
                model=self._settings.ai_narrative_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.4,
                top_p=0.9,
                max_tokens=120,
            )
            content = response.choices[0].message.content
            return content.strip() if content else None
        except Exception as exc:
            logger.warning("AI narrative synthesis failed: %s", exc)
            return None


# Module-level singleton
openai_client = OpenAIClient()
