"""
Module: backend.ai.synthesizer
Responsibility: Orchestrate the full AI narrative synthesis pipeline.

Pipeline:
  Deterministic metrics + behavioral records
  → NarrativeContextBuilder (semantic compression)
  → context_hash check (skip if unchanged — cognition-aware, not request-aware)
  → Load prompt template
  → OpenAI client call (expression only, not cognition)
  → NarrativeValidator (safety gate)
  → Return GeneratedNarrative or None (graceful fallback)

The synthesizer NEVER:
  - computes portfolio intelligence
  - infers financial truth
  - overrides deterministic state
  - exposes LLM identity to the user
"""

import logging
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from uuid import UUID

from ai import context_builder as cb
from ai.client import OpenAIClient, openai_client
from ai.schemas import GeneratedNarrative, NarrativeContext
from ai import validator
from behavioral_memory.models import RecommendationBehaviorRecord
from core.config import get_settings

logger = logging.getLogger(__name__)

PROMPT_DIR = Path(__file__).parent / "prompts"
PROMPT_VERSION = "1.0.0"  # Must match client.py — bump on prompt changes


def _load_prompt(name: str) -> str:
    path = PROMPT_DIR / f"{name}.txt"
    return path.read_text(encoding="utf-8")


def _determine_generation_reason(
    existing_hash: Optional[str],
    new_hash: str,
) -> Optional[str]:
    """
    Determine whether generation should proceed and why.
    Returns a generation_reason string, or None if regeneration should be skipped.
    """
    if existing_hash is None:
        return "initial_generation"
    if existing_hash != new_hash:
        return "cognition_drift"
    return None  # No change — skip


class NarrativeSynthesizer:
    """
    Orchestrates the full synthesis pipeline.
    Instantiate with the current snapshot's existing hash to enable deduplication.
    """

    def __init__(self, client: OpenAIClient = openai_client) -> None:
        self._client = client
        self._settings = get_settings()

    async def synthesize(
        self,
        snapshot_id: UUID,
        complexity: float,
        redundancy: float,
        density: float,
        burden: float,
        alignment: float,
        card_count: int,
        behaviors: List[RecommendationBehaviorRecord],
        existing_context_hash: Optional[str] = None,
        fallback_narrative: str = "",
    ) -> Optional[GeneratedNarrative]:
        """
        Run the full synthesis pipeline.

        Returns a GeneratedNarrative on success, or None if:
          - AI is disabled in settings
          - API key is not configured
          - Context hash unchanged (deduplication)
          - Synthesis or validation fails (graceful degradation)
        """
        if not self._settings.ai_narrative_enabled:
            logger.debug("AI narrative synthesis disabled via settings")
            return None

        # 1. Build semantic context
        context: NarrativeContext = cb.build_context(
            complexity=complexity,
            redundancy=redundancy,
            density=density,
            burden=burden,
            alignment=alignment,
            card_count=card_count,
            behaviors=behaviors,
        )

        # 2. Compute hash (includes prompt version — regen on prompt improvements)
        new_hash = cb.compute_context_hash(context, PROMPT_VERSION)

        # 3. Check for meaningful change — skip if cognition state unchanged
        generation_reason = _determine_generation_reason(existing_context_hash, new_hash)
        if generation_reason is None:
            logger.debug("Narrative synthesis skipped: context hash unchanged (snapshot %s)", snapshot_id)
            return None

        # 4. Load system prompt
        try:
            system_prompt = _load_prompt("portfolio_reflection")
        except FileNotFoundError:
            logger.error("Prompt file not found: portfolio_reflection.txt")
            return None

        # 5. Format user message
        user_message = cb.format_user_message(context)

        # 6. Call LLM
        raw_narrative = await self._client.synthesize(system_prompt, user_message)
        if raw_narrative is None:
            logger.info("AI synthesis returned None for snapshot %s — using fallback", snapshot_id)
            return None

        # 7. Validate editorial quality and tone
        is_valid, rejection_reason = validator.validate(raw_narrative)
        if not is_valid:
            logger.warning(
                "Narrative rejected for snapshot %s: %s | Raw: %.120s",
                snapshot_id, rejection_reason, raw_narrative
            )
            return None

        # 8. Return full auditable record
        return GeneratedNarrative(
            narrative=raw_narrative,
            source_snapshot_id=snapshot_id,
            generated_at=datetime.utcnow(),
            narrative_type="portfolio_reflection",
            context_hash=new_hash,
            prompt_version=PROMPT_VERSION,
            model=self._settings.ai_narrative_model,
            generation_reason=generation_reason,
        )


# Module-level singleton
narrative_synthesizer = NarrativeSynthesizer()
