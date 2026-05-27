"""
Module: backend.ai.schemas
Responsibility: Type contracts for the AI narrative synthesis pipeline.

NarrativeContext  — compact semantic cognition state fed to the LLM.
GeneratedNarrative — the output record with full auditability metadata.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class NarrativeContext(BaseModel):
    """
    Compact semantic representation of portfolio cognition state.
    This is ALL the LLM ever sees — never raw scores, transactions, or DB rows.
    """
    portfolio_direction: str          # e.g. "simplifying", "expanding", "stable"
    strategy_shift: Optional[str]     # e.g. "cashback_to_travel", None
    behavioral_alignment: str         # e.g. "high", "moderate", "low"
    optimization_burden: str          # e.g. "rising", "declining", "stable"
    redundancy_state: str             # e.g. "high", "moderate", "low"
    dominant_tension: Optional[str]   # e.g. "coverage_vs_simplicity", None
    recommendation_consistency: str   # e.g. "stable", "drifting"
    recent_behavioral_pattern: Optional[str]  # e.g. "favoring_concentrated_usage"
    card_count: int                   # Total active cards — grounds the narrative


class GeneratedNarrative(BaseModel):
    """
    Full record of a synthesis event — stored alongside deterministic state for auditability.
    """
    narrative: str
    source_snapshot_id: UUID
    generated_at: datetime
    narrative_type: str               # e.g. "portfolio_reflection"
    context_hash: str                 # SHA-256 of context + prompt_version
    prompt_version: str               # Semver — triggers regen when prompt improves
    model: str                        # e.g. "gpt-4o"
    generation_reason: str            # e.g. "topology_shift", "initial_generation"
