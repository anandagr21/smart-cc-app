"""
Module: backend.reward_engine.cap_schemas
Responsibility: Pydantic v2 schemas for deterministic multi-cap evaluation.

Architectural Boundaries:
- Pure data definitions — no I/O, no business logic.
- Extends the single-cap CapResult in schemas.py with multi-cap support.
- Used by cap_matcher, caps, cap_normalizer for type-safe data exchange.
- MUST NOT import from DB layer, services, or routes.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field

from reward_engine.constants import CapScope


# ---------------------------------------------------------------------------
# Cap Rule Definition
# ---------------------------------------------------------------------------


class CapRule(BaseModel):
    """A single normalized cap rule consumed by the caps engine.

    Each cap rule has a type (monthly/annual/merchant/category/transaction),
    a monetary limit, a scope that determines applicability, and optional
    merchant/category filters for targeted caps.
    """

    cap_type: str = Field(
        ...,
        description="Type of cap: 'monthly_cap', 'annual_cap', 'merchant_cap', "
        "'category_cap', 'transaction_cap'.",
    )
    limit: Decimal = Field(
        ...,
        gt=0,
        description="Maximum reward amount allowed by this cap in INR.",
    )
    scope: CapScope = Field(
        ...,
        description="Scope of the cap (per_transaction, monthly, category, annual).",
    )
    merchant: str | None = Field(
        default=None,
        description="Merchant this cap applies to (for merchant caps).",
    )
    category: str | None = Field(
        default=None,
        description="Category this cap applies to (for category caps).",
    )
    priority: int = Field(
        default=0,
        ge=0,
        le=1000,
        description="Application priority. Lower values are applied first.",
    )

    model_config = {"extra": "ignore"}


# ---------------------------------------------------------------------------
# Single Cap Application Detail
# ---------------------------------------------------------------------------


class CapApplicationDetail(BaseModel):
    """Detailed result of applying a single cap rule.

    Captures the before/after reward values, how much was reduced,
    and whether the cap is now fully exhausted.
    """

    cap_rule: CapRule = Field(
        ...,
        description="The cap rule that was applied.",
    )
    reward_before: Decimal = Field(
        ...,
        description="Reward value before this cap was applied.",
    )
    reward_after: Decimal = Field(
        ...,
        ge=0,
        description="Reward value after this cap was applied.",
    )
    reduction: Decimal = Field(
        default=Decimal("0"),
        ge=0,
        description="Amount reduced by this cap application.",
    )
    headroom_before: Decimal = Field(
        ...,
        description="Remaining headroom before this application.",
    )
    headroom_after: Decimal = Field(
        ...,
        ge=0,
        description="Remaining headroom after this application.",
    )
    is_exhausted: bool = Field(
        default=False,
        description="Whether the cap is fully exhausted after this application.",
    )

    model_config = {"extra": "ignore"}


# ---------------------------------------------------------------------------
# Multi-Cap Evaluation Result
# ---------------------------------------------------------------------------


class CapEvaluationResult(BaseModel):
    """Complete result of evaluating all applicable caps against a reward.

    Contains the original uncapped reward, the final adjusted reward,
    details for each cap applied, and any warnings generated during
    cap evaluation.
    """

    original_reward: Decimal = Field(
        ...,
        ge=0,
        description="The reward value before any caps were applied.",
    )
    adjusted_reward: Decimal = Field(
        ...,
        ge=0,
        description="The final reward value after all caps were applied.",
    )
    caps_applied: list[CapApplicationDetail] = Field(
        default_factory=list,
        description="Details for each cap that was applied, in order.",
    )
    total_reduction: Decimal = Field(
        default=Decimal("0"),
        ge=0,
        description="Total amount reduced across all caps.",
    )
    remaining_headrooms: dict[str, Decimal] = Field(
        default_factory=dict,
        description="Remaining headroom per cap (keyed by cap type + scope).",
    )
    warnings: list[str] = Field(
        default_factory=list,
        description="Non-fatal warnings (e.g., cap nearly exhausted).",
    )
    was_capped: bool = Field(
        default=False,
        description="True if any cap reduced the reward.",
    )

    model_config = {"extra": "ignore"}


# ---------------------------------------------------------------------------
# Cap Configuration Input (for normalizer)
# ---------------------------------------------------------------------------


class CapConfigInput(BaseModel):
    """Raw cap configuration as it appears in rule_config dicts.

    This is the input shape the cap_normalizer consumes before producing
    a list of CapRule objects.
    """

    cap_type: str = Field(
        default="transaction_cap",
        description="Type identifier for the cap.",
    )
    limit: Any = Field(
        default=0,
        description="Cap limit value (will be normalized to Decimal).",
    )
    scope: str = Field(
        default="per_transaction",
        description="Scope string (will be resolved to CapScope).",
    )
    merchant: str | None = Field(default=None)
    category: str | None = Field(default=None)
    priority: int = Field(default=0)

    model_config = {"extra": "ignore"}