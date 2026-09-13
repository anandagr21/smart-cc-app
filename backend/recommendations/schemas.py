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
from uuid import UUID

from pydantic import BaseModel, Field

from reward_engine.constants import PaymentMode, RewardType
from schemas.common import SingleResponse


from reward_engine.transaction_optimizer.schemas import OptimizationIntent, OptimizerRankedCard


class MissingBestCard(BaseModel):
    """Gap card not in wallet — deterministic shadow rank."""

    card_id: UUID = Field(..., description="Catalog card id (not UserCard).")
    card_name: str = Field(..., description="Display name.")
    bank_name: str | None = Field(default=None)
    affiliate_url: str = Field(..., description="Partner apply link; ranking never uses it.")
    incremental_reward: float = Field(..., description="global_best - owned_best in INR for this txn.")
    owned_best_reward: float = Field(...)
    global_best_reward: float = Field(...)
    annual_fee: float = Field(default=0)
    fee_waiver_threshold: float | None = Field(default=None)
    why_better: str = Field(default="", description="Human line: e.g. 5% on Flipkart vs your 1.5% capped.")
    cap_note: str | None = Field(default=None)
    disclosure: str = Field(default="Partner link — ranking unchanged.")

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
    skip_resolution: bool = Field(
        default=False, description="If true, skip the merchant resolution engine and use the raw name directly."
    )

class RecommendationResponse(BaseModel):
    """Full response for a recommendation request."""

    calculation_id: str | None = Field(
        default=None, description="Unique trace ID for this recommendation calculation."
    )
    resolved_merchant_name: str | None = Field(
        default=None, description="Canonical merchant name if resolved via auto-correction UX."
    )
    resolution_confidence: float | None = Field(
        default=None, description="Confidence score from the merchant resolution engine."
    )
    resolution_type: str | None = Field(
        default=None, description="Type of merchant resolution (e.g., ALIAS, FUZZY_AUTO, LLM_RECOVERY)."
    )
    resolution_source: str | None = Field(
        default=None, description="Source of the resolution for analytics and tracking."
    )
    merchant_id: UUID | None = Field(
        default=None, description="UUID of the resolved merchant, if applicable."
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
    missing_best_card: MissingBestCard | None = Field(
        default=None, description="Best catalog card not in wallet that beats owned best — gap affiliate wedge."
    )
