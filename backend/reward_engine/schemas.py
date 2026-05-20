"""
Module: backend.reward_engine.schemas
Responsibility: Pure Pydantic v2 data models for the deterministic reward engine.

Architectural Boundaries:
- Pure data definitions — no I/O, no business logic.
- Defines input (transaction context) and output (evaluation result) shapes.
- Used by all engine sub-modules for type-safe data exchange.
- MUST NOT import from DB layer, services, or routes.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field, model_validator

from reward_engine.constants import CapScope, MatchType, PaymentMode, RewardType


# ---------------------------------------------------------------------------
# Transaction Input
# ---------------------------------------------------------------------------


class TransactionContext(BaseModel):
    """Normalized transaction data consumed by the reward engine.

    All monetary values are Decimal for deterministic precision.
    The engine receives this from the service layer, never directly
    from API routes or DB models.
    """

    merchant: str = Field(
        ...,
        min_length=1,
        description="Normalized merchant name (lowercase, trimmed).",
    )
    category: str = Field(
        ...,
        min_length=1,
        description="Normalized transaction category (e.g., 'dining', 'fuel').",
    )
    amount: Decimal = Field(
        ...,
        gt=0,
        description="Transaction amount in INR.",
    )
    payment_mode: PaymentMode | str = Field(
        default=PaymentMode.ANY,
        description="Payment mode of the transaction.",
    )
    transaction_date: date | None = Field(
        default=None,
        description="Date when the transaction occurred.",
    )
    is_online: bool = Field(
        default=False,
        description="Whether the transaction was conducted online.",
    )
    mcc_code: str | None = Field(
        default=None,
        description="Merchant Category Code (4-digit string).",
    )
    cumulative_spend: Decimal = Field(
        default=Decimal("0"),
        ge=0,
        description="Cumulative spend on this card for cap evaluation (same period).",
    )

    @model_validator(mode="after")
    def _normalize_strings(self) -> "TransactionContext":
        """Normalize merchant and category to lowercase for case-insensitive matching."""
        self.merchant = self.merchant.strip().lower()
        self.category = self.category.strip().lower()
        return self

    @property
    def payment_mode_enum(self) -> PaymentMode:
        """Return the payment mode as a PaymentMode enum value."""
        if isinstance(self.payment_mode, PaymentMode):
            return self.payment_mode
        try:
            return PaymentMode(self.payment_mode)
        except ValueError:
            return PaymentMode.ANY


# ---------------------------------------------------------------------------
# Normalized Rule Config (what the engine consumes after normalization)
# ---------------------------------------------------------------------------


class NormalizedRuleConfig(BaseModel):
    """A single reward rule normalized for engine consumption.

    This is the shape the engine expects after the rewards service layer
    has validated and normalized the raw rule_config JSONB blob.
    """

    rule_name: str = Field(..., description="Human-readable rule name.")
    rule_type: str = Field(..., description="Canonical rule type (e.g., 'merchant_bonus').")
    priority: int = Field(default=0, ge=0, le=1000)
    config: dict[str, Any] = Field(
        default_factory=dict,
        description="Normalized rule_config with all defaults filled.",
    )

    model_config = {"extra": "ignore"}


# ---------------------------------------------------------------------------
# Evaluation Breakdown (step-by-step trace)
# ---------------------------------------------------------------------------


class EvaluationStep(BaseModel):
    """A single step in the reward computation pipeline.

    Each step captures what happened and the intermediate values,
    enabling full auditability and deterministic replay.
    """

    step: str = Field(..., description="Name of the computation step.")
    description: str = Field(default="", description="Human-readable explanation.")
    input_value: Any = Field(default=None, description="Input value to this step.")
    output_value: Any = Field(default=None, description="Output value from this step.")


# ---------------------------------------------------------------------------
# Match Result
# ---------------------------------------------------------------------------


class MatchResult(BaseModel):
    """Result of matching a transaction against reward rules."""

    rule_name: str = Field(..., description="Name of the matched rule.")
    rule_type: str = Field(..., description="Type of the matched rule.")
    match_type: MatchType = Field(..., description="How the match was resolved.")
    reward_type: RewardType = Field(..., description="Type of reward (cashback/points).")
    reward_rate: Decimal = Field(default=Decimal("0"), description="Effective reward rate.")
    config: dict[str, Any] = Field(
        default_factory=dict,
        description="The matched rule's full config.",
    )


# ---------------------------------------------------------------------------
# Exclusion Result
# ---------------------------------------------------------------------------


class ExclusionResult(BaseModel):
    """Result of exclusion evaluation for a transaction."""

    is_excluded: bool = Field(default=False, description="Whether the transaction is excluded.")
    reason: str | None = Field(
        default=None, description="Human-readable exclusion reason if excluded."
    )
    matched_rule: str | None = Field(
        default=None, description="Name of the exclusion rule that triggered."
    )


# ---------------------------------------------------------------------------
# Points Result
# ---------------------------------------------------------------------------


class PointsResult(BaseModel):
    """Result of points evaluation for a transaction."""

    earned_points: int = Field(default=0, description="Total reward points earned.")
    rupee_value_per_point: Decimal = Field(
        default=Decimal("0"), description="Value of one point in INR."
    )
    rupee_value: Decimal = Field(
        default=Decimal("0"), description="Total INR value of earned points."
    )


# ---------------------------------------------------------------------------
# Cap Result
# ---------------------------------------------------------------------------


class CapResult(BaseModel):
    """Result of cap application."""

    was_capped: bool = Field(default=False, description="Whether a cap was applied.")
    cap_scope: CapScope | None = Field(default=None, description="Scope of the applied cap.")
    cap_limit: Decimal = Field(default=Decimal("0"), description="The cap limit value.")
    uncapped_reward: Decimal = Field(default=Decimal("0"), description="Reward before capping.")
    capped_reward: Decimal = Field(default=Decimal("0"), description="Reward after capping.")


# ---------------------------------------------------------------------------
# Evaluation Result (main output)
# ---------------------------------------------------------------------------


class EvaluationResult(BaseModel):
    """Complete deterministic reward evaluation result.

    This is the single output shape produced by the engine. It contains
    all information needed to explain and audit the reward computation.
    """

    # ---- Primary Output ----
    effective_reward_inr: Decimal = Field(
        default=Decimal("0"),
        description="Final effective reward value in rupees.",
    )
    reward_type: RewardType = Field(
        default=RewardType.NONE,
        description="Type of reward earned.",
    )

    # ---- Cashback Output ----
    cashback_amount: Decimal | None = Field(
        default=None,
        description="Cashback amount in INR (if applicable).",
    )

    # ---- Points Output ----
    reward_points: int | None = Field(
        default=None,
        description="Points earned (if applicable).",
    )
    point_value_inr: Decimal | None = Field(
        default=None,
        description="Effective INR value of points earned (if applicable).",
    )

    # ---- Match Info ----
    matched_rule: MatchResult | None = Field(
        default=None,
        description="The rule that was matched and applied.",
    )
    applied_rate: Decimal = Field(
        default=Decimal("0"),
        description="The reward rate that was applied.",
    )

    # ---- Cap Info ----
    cap_result: CapResult | None = Field(
        default=None,
        description="Cap application result, if any cap was evaluated.",
    )

    # ---- Exclusion Info ----
    is_excluded: bool = Field(
        default=False,
        description="Whether this transaction was excluded from rewards.",
    )
    exclusion_reason: str | None = Field(
        default=None,
        description="Human-readable exclusion reason if excluded.",
    )

    # ---- Audit Trail ----
    breakdown: list[EvaluationStep] = Field(
        default_factory=list,
        description="Step-by-step trace of the computation pipeline.",
    )
    warnings: list[str] = Field(
        default_factory=list,
        description="Non-fatal warnings (e.g., missing redemption rate).",
    )
    explanations: list[str] = Field(
        default_factory=list,
        description="Human-readable explanations of the evaluation outcome.",
    )

    @classmethod
    def zero(
        cls,
        *,
        exclusion_reason: str | None = None,
        warnings: list[str] | None = None,
        breakdown: list[EvaluationStep] | None = None,
    ) -> "EvaluationResult":
        """Factory for a zero-reward result (excluded or no match)."""
        return cls(
            effective_reward_inr=Decimal("0"),
            reward_type=RewardType.NONE,
            is_excluded=exclusion_reason is not None,
            exclusion_reason=exclusion_reason,
            warnings=warnings or [],
            breakdown=breakdown or [],
        )


# ---------------------------------------------------------------------------
# API Request / Response Schemas
# ---------------------------------------------------------------------------


class EvaluateRequest(BaseModel):
    """Incoming request body for the /reward-engine/evaluate endpoint.

    Carries transaction data and normalized rule configs from the caller.
    The route layer validates & deserializes this, then passes domain objects
    (TransactionContext + list[NormalizedRuleConfig]) into the pure engine.
    """

    transaction: dict[str, Any] = Field(
        ...,
        description="Transaction context as a raw dict (validated into TransactionContext).",
    )
    rules: list[dict[str, Any]] = Field(
        ...,
        min_length=1,
        description="Normalized rule configs as raw dicts (validated into NormalizedRuleConfig).",
    )


class EvaluateResponse(EvaluationResult):
    """Response body returned by the /reward-engine/evaluate endpoint.

    Mirrors the EvaluationResult schema exactly.  This alias allows the route
    to evolve its response shape independently of the core domain model if
    needed in the future (e.g. adding request metadata).
    """

    pass


# ===========================================================================
# When importing this module, ensure it's at the top so Pydantic can dereference
# forward references.
# ===========================================================================
EvaluationResult.model_rebuild()
MatchResult.model_rebuild()
