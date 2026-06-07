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


from reward_engine.transaction_optimizer.schemas import OptimizationIntent, OptimizerRankedCard

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
    intent: OptimizationIntent = Field(
        default=OptimizationIntent.BALANCED, description="The user's optimization intent."
    )

class RecommendationResponse(BaseModel):
    """Full response for a recommendation request."""

    calculation_id: str | None = Field(
        default=None, description="Unique trace ID for this recommendation calculation."
    )
    normalized_merchant: str | None = Field(
        default=None, description="Canonical merchant name if matched."
    )
    category: str | None = Field(
        default=None, description="Inferred or matched transaction category."
    )
    best_cashback_card: OptimizerRankedCard | None = Field(
        default=None, description="Card with highest immediate reward."
    )
    best_fee_waiver_card: OptimizerRankedCard | None = Field(
        default=None, description="Card that best preserves fee waiver."
    )
    best_balanced_card: OptimizerRankedCard | None = Field(
        default=None, description="Card with highest blended balanced score."
    )
    best_simplify_card: OptimizerRankedCard | None = Field(
        default=None, description="Card that best simplifies the wallet."
    )
    all_ranked_cards: list[OptimizerRankedCard] = Field(
        ..., description="All cards ranked by selected intent's blended score."
    )
    explanations: list[str] = Field(
        default_factory=list, description="Top-level aggregate explanations."
    )
    warnings: list[str] = Field(
        default_factory=list, description="Top-level aggregate warnings."
    )
