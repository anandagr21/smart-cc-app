"""
Module: backend.reward_engine.ranking_schemas
Responsibility: Pure Pydantic v2 data models for the deterministic ranking engine.

Architectural Boundaries:
- Pure data definitions — no I/O, no business logic.
- Defines the ranking engine's input (CardEvaluationInput) and
  output (RankedRecommendation, RankingResult) shapes.
- Consumes EvaluationResult from reward_engine.schemas (read-only).
- MUST NOT import from DB layer, services, routes, or AI modules.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field

from reward_engine.constants import RewardType, ZERO_DECIMAL
from reward_engine.schemas import EvaluationResult


# ---------------------------------------------------------------------------
# Ranking Input
# ---------------------------------------------------------------------------


class CardEvaluationInput(BaseModel):
    """A single card's identity paired with its pre-computed evaluation result.

    The ranking engine is a pure consumer of evaluation outputs. It never
    computes rewards itself — it only compares and orders these inputs.

    Attributes:
        card_id: Stable unique identifier for the card (UUID string or slug).
        card_name: Human-readable display name.
        evaluation: The full EvaluationResult from reward_engine.evaluator.
        annual_fee: Optional annual fee in INR for secondary tie-breaking.
    """

    card_id: str = Field(..., min_length=1, description="Unique card identifier.")
    card_name: str = Field(..., min_length=1, description="Human-readable card name.")
    evaluation: EvaluationResult = Field(
        ..., description="Pre-computed evaluation result from the reward engine."
    )
    annual_fee: Decimal = Field(
        default=ZERO_DECIMAL,
        ge=0,
        description="Annual fee in INR (used as secondary tie-breaker; 0 = no fee).",
    )

    model_config = {"extra": "ignore"}


# ---------------------------------------------------------------------------
# Ranking Output
# ---------------------------------------------------------------------------


class RankedRecommendation(BaseModel):
    """A single card recommendation with its rank and explanation.

    Produced exclusively by the ranking engine. Each field is deterministic
    and reproducible given the same inputs.
    """

    rank: int = Field(..., ge=1, description="1-based rank (1 = best recommendation).")
    card_id: str = Field(..., description="Unique card identifier.")
    card_name: str = Field(..., description="Human-readable card name.")

    # ---- Core reward values ----
    effective_reward_inr: Decimal = Field(
        default=ZERO_DECIMAL,
        description="Effective reward value in INR (normalized across all reward types).",
    )
    cashback_amount: Decimal | None = Field(
        default=None, description="Cashback earned in INR (if reward type is cashback)."
    )
    reward_points: int | None = Field(
        default=None, description="Points earned (if reward type is points)."
    )
    reward_type: RewardType = Field(
        default=RewardType.NONE, description="Type of reward earned."
    )

    # ---- Explanation ----
    recommendation_reason: str = Field(
        default="", description="Primary deterministic explanation for this ranking."
    )
    explanations: list[str] = Field(
        default_factory=list,
        description="Ordered list of human-readable explanation lines.",
    )
    warnings: list[str] = Field(
        default_factory=list, description="Forwarded evaluation warnings."
    )

    # ---- Metadata ----
    is_excluded: bool = Field(
        default=False, description="Whether this card was excluded from rewards."
    )
    was_capped: bool = Field(
        default=False, description="Whether a reward cap was applied."
    )
    annual_fee: Decimal = Field(
        default=ZERO_DECIMAL, description="Card annual fee in INR."
    )


class RankingResult(BaseModel):
    """The complete output of the deterministic ranking engine.

    Contains the ordered list of recommendations plus summary metadata.
    Rankings are always deterministic: the same inputs produce the same list.
    """

    ranked: list[RankedRecommendation] = Field(
        default_factory=list,
        description="Cards ordered best-to-worst. Rank 1 is the top recommendation.",
    )
    total_evaluated: int = Field(
        default=0, description="Total number of cards evaluated (including excluded)."
    )
    top_card_id: str | None = Field(
        default=None, description="card_id of the #1 ranked card, or None if no cards."
    )
    all_excluded: bool = Field(
        default=False,
        description="True if every card was excluded (transaction yields zero reward everywhere).",
    )
    meta: dict[str, Any] = Field(
        default_factory=dict,
        description="Optional metadata (e.g., transaction context summary).",
    )
