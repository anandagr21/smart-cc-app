"""
Module: backend.ai.context_builder
Responsibility: Convert deterministic cognition state into compact semantic NarrativeContext.

THIS IS THE MOST IMPORTANT FILE IN THE AI MODULE.

The LLM never sees raw scores, database rows, transactions, or metric values.
It receives only clean semantic primitives derived from those values.

This is the boundary between deterministic intelligence and editorial synthesis.
"""

import hashlib
import json
from typing import List, Optional

from behavioral_memory.models import RecommendationBehaviorRecord
from ai.schemas import NarrativeContext


# Prompt version is imported from client to ensure the hash includes it
PROMPT_VERSION = "1.0.0"


def _classify_direction(complexity: float, burden: float) -> str:
    """Derive a simple portfolio direction label from complexity and burden signals."""
    if burden > 6.0 or complexity > 7.0:
        return "simplifying"
    elif burden < 3.0 and complexity < 4.0:
        return "concentrated"
    else:
        return "stable"


def _classify_redundancy(redundancy: float) -> str:
    if redundancy > 6.0:
        return "high"
    elif redundancy > 3.5:
        return "moderate"
    return "low"


def _classify_burden(burden: float) -> str:
    if burden > 6.5:
        return "rising"
    elif burden < 3.0:
        return "declining"
    return "stable"


def _classify_alignment(alignment: float) -> str:
    if alignment > 7.5:
        return "high"
    elif alignment > 4.5:
        return "moderate"
    return "low"


def _derive_behavioral_pattern(behaviors: List[RecommendationBehaviorRecord]) -> Optional[str]:
    """Derive a behavioral pattern label from recent behavioral memory."""
    if not behaviors:
        return None
    total = len(behaviors)
    followed = sum(1 for b in behaviors if b.was_followed)
    follow_rate = followed / total

    if follow_rate < 0.4:
        return "frequently_overriding_recommendations"
    elif follow_rate > 0.8:
        return "closely_following_recommendations"
    return "mixed_adherence"


def _derive_recommendation_consistency(behaviors: List[RecommendationBehaviorRecord]) -> str:
    """Assess whether the user's card choices are consistent over time."""
    if not behaviors:
        return "stable"
    # Look at unique cards selected in recent window
    unique_cards = len(set(str(b.selected_card_id) for b in behaviors[-10:]))
    if unique_cards <= 2:
        return "concentrated"
    elif unique_cards >= 5:
        return "drifting"
    return "stable"


def _derive_dominant_tension(redundancy: float, burden: float, density: float) -> Optional[str]:
    """Identify the single most important strategic tension in the portfolio."""
    if redundancy > 5.0 and burden > 5.0:
        return "coverage_vs_simplicity"
    if density < 0.5 and redundancy > 4.0:
        return "fee_burden_vs_coverage"
    if burden > 6.0 and density > 2.0:
        return "value_vs_operational_complexity"
    return None


def build_context(
    complexity: float,
    redundancy: float,
    density: float,
    burden: float,
    alignment: float,
    card_count: int,
    behaviors: List[RecommendationBehaviorRecord],
) -> NarrativeContext:
    """
    Synthesize all deterministic signals into a compact NarrativeContext.
    This is the only transformation applied before feeding state to the LLM.
    """
    return NarrativeContext(
        portfolio_direction=_classify_direction(complexity, burden),
        strategy_shift=None,  # Reserved for future multi-snapshot comparison
        behavioral_alignment=_classify_alignment(alignment),
        optimization_burden=_classify_burden(burden),
        redundancy_state=_classify_redundancy(redundancy),
        dominant_tension=_derive_dominant_tension(redundancy, burden, density),
        recommendation_consistency=_derive_recommendation_consistency(behaviors),
        recent_behavioral_pattern=_derive_behavioral_pattern(behaviors),
        card_count=card_count,
    )


def compute_context_hash(context: NarrativeContext, prompt_version: str) -> str:
    """
    Compute a SHA-256 hash of the semantic context + prompt version.

    Including prompt_version ensures that narrative regeneration occurs when the
    system prompt is improved, even if the portfolio state has not changed.
    This prevents stale narratives from persisting indefinitely after prompt upgrades.
    """
    payload = {
        **context.model_dump(),
        "_prompt_version": prompt_version,
    }
    canonical = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(canonical.encode()).hexdigest()


def format_user_message(context: NarrativeContext) -> str:
    """
    Format the NarrativeContext as a clean JSON block for the LLM user message.
    Only semantic labels are included — never raw numbers.
    """
    data = context.model_dump(exclude_none=True)
    return f"Portfolio cognition state:\n{json.dumps(data, indent=2)}"
