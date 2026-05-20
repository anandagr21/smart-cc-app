"""
Module: backend.rewards.schemas
Responsibility: Pydantic v2 request/response schemas for reward rule API contracts.

Architectural Boundaries:
- Validates incoming API data using Pydantic.
- Shapes outgoing API responses.
- MUST NOT contain database mappings or SQLModel references.
- Used by routes.py for OpenAPI documentation and request validation.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

from rewards.constants import RewardRuleType


# ---------------------------------------------------------------------------
# Base Config Schema (shared by create/response)
# ---------------------------------------------------------------------------


class _RewardRuleBase(BaseModel):
    """Shared fields for all reward rule schemas."""

    card_id: str = Field(
        ...,
        description="UUID of the card this rule belongs to.",
        min_length=1,
    )
    rule_name: str = Field(
        ...,
        description="Human-readable name for this rule (e.g., 'Swiggy 10% Cashback').",
        min_length=1,
        max_length=255,
    )
    rule_type: RewardRuleType = Field(
        ...,
        description="Type of reward rule from the canonical set.",
    )
    priority: int = Field(
        default=0,
        ge=0,
        le=1000,
        description="Execution priority — lower values are evaluated first.",
    )
    is_active: bool = Field(
        default=True,
        description="Whether this rule is currently active for evaluation.",
    )
    rule_config: dict[str, Any] = Field(
        default_factory=dict,
        description="Flexible JSONB configuration for this rule (rates, caps, merchants, etc.).",
    )


# ---------------------------------------------------------------------------
# Request Schemas
# ---------------------------------------------------------------------------


class RewardRuleCreate(_RewardRuleBase):
    """Schema for creating a new reward rule.

    All fields except `rule_config` and optional ones are required.
    The `rule_config` is validated by the service layer after Pydantic
    validates the outer shape.
    """

    pass


class RewardRuleUpdate(BaseModel):
    """Schema for partially updating an existing reward rule.

    All fields are optional — only provided fields are applied.
    Setting a field to `None` is ignored; use explicit values to clear.
    """

    rule_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
        description="Updated human-readable rule name.",
    )
    rule_type: RewardRuleType | None = Field(
        default=None,
        description="Updated rule type.",
    )
    priority: int | None = Field(
        default=None,
        ge=0,
        le=1000,
        description="Updated execution priority.",
    )
    is_active: bool | None = Field(
        default=None,
        description="Updated active status.",
    )
    rule_config: dict[str, Any] | None = Field(
        default=None,
        description="Updated JSONB configuration (replaces entire config).",
    )


# ---------------------------------------------------------------------------
# Response Schemas
# ---------------------------------------------------------------------------


class RewardRuleResponse(_RewardRuleBase):
    """Schema for reward rule API responses.

    Includes server-generated fields: id, created_at, updated_at.
    """

    id: str = Field(..., description="UUID of the reward rule.")
    created_at: datetime = Field(
        ...,
        description="Timestamp when this rule was created (UTC).",
    )
    updated_at: datetime | None = Field(
        default=None,
        description="Timestamp when this rule was last updated (UTC).",
    )

    model_config = {"from_attributes": True}