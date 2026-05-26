"""
Module: backend.recommendations.schemas
Responsibility: API contracts for recommendations orchestration.

Architectural Boundaries:
- Pure data definitions.
- Does not contain business logic or DB dependencies.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field

from reward_engine.constants import PaymentMode, RewardType
from schemas.common import SingleResponse


class RecommendationRequest(BaseModel):
    """Input parameters for a recommendation request."""

    merchant_name: str = Field(..., min_length=1, description="Raw merchant name input.")
    amount: Decimal = Field(..., gt=0, description="Transaction amount in INR.")
    payment_mode: PaymentMode | str = Field(
        default=PaymentMode.ANY, description="Payment mode (online, offline, etc.)."
    )
    transaction_date: date | None = Field(
        default=None, description="Optional date; defaults to today in orchestrator."
    )
    mcc_code: str | None = Field(
        default=None, description="Optional MCC code if known."
    )


class RankedCardResponse(BaseModel):
    """A single card in the ranked output list."""

    card_id: str = Field(..., description="Unique card identifier.")
    card_name: str = Field(..., description="Human-readable card name.")
    rank: int = Field(..., ge=1, description="1-based rank position.")

    effective_reward_value: Decimal = Field(..., description="Effective INR value of rewards.")
    cashback_amount: Decimal | None = Field(default=None, description="Cashback earned (if applicable).")
    reward_points: int | None = Field(default=None, description="Points earned (if applicable).")
    reward_type: RewardType = Field(..., description="Type of reward.")

    recommendation_reason: str = Field(..., description="Primary reason for ranking.")
    warnings: list[str] = Field(default_factory=list, description="Warnings related to this card.")

    # ---- Phase 2: Explainability & Intelligence ----
    # Core Engine Metrics
    portfolio_score: float = Field(..., description="Master portfolio optimization score.")
    immediate_reward_value: float = Field(..., description="Value of immediate rewards.")
    long_term_portfolio_value: float = Field(..., description="Value of long-term optimization.")
    waiver_acceleration: float = Field(..., description="Value of fee waiver progress.")
    milestone_acceleration: float = Field(..., description="Value of milestone progress.")
    
    # Explainability & Breakdown
    portfolio_score_breakdown: dict[str, float] = Field(..., description="Score contributions by factor.")
    objective_rankings: dict[str, int] = Field(..., description="Ranking of this card for each objective.")
    reason_codes: list[str] = Field(default_factory=list, description="Structured reason codes for why this was recommended.")
    explanation: str = Field(..., description="Human-readable explanation of the recommendation.")

class RecommendationResponse(BaseModel):
    """Full response for a recommendation request."""

    normalized_merchant: str | None = Field(
        default=None, description="Canonical merchant name if matched."
    )
    category: str | None = Field(
        default=None, description="Inferred or matched transaction category."
    )
    best_card: str | None = Field(
        default=None, description="Name of the #1 ranked card."
    )
    ranked_cards: list[RankedCardResponse] = Field(
        ..., description="Ordered list of evaluated cards."
    )
    explanations: list[str] = Field(
        default_factory=list, description="Top-level aggregate explanations."
    )
    warnings: list[str] = Field(
        default_factory=list, description="Top-level aggregate warnings."
    )
