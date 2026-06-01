"""
Module: backend.rewards.models
Responsibility: Database entity for storing normalized reward rule definitions.

Architectural Boundaries:
- Data persistence only — no business logic, no reward calculations.
- Uses SQLModel for both DB table definition and Pydantic validation.
- The `rule_config` column is PostgreSQL JSONB for flexible schema storage.
- The reward engine consumes these rule definitions but does NOT modify them.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Column, Index
from sqlalchemy.types import JSON
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlmodel import Field, SQLModel

from rewards.constants import RewardRuleType

if TYPE_CHECKING:
    pass


class RewardRule(SQLModel, table=True):
    """Normalized reward rule definition for a credit card.

    Each row represents one reward rule (e.g., "Swiggy 10% cashback",
    "Fuel exclusion", "Monthly ₹1500 cap"). Rules are consumed by the
    deterministic reward engine to calculate effective rewards.

    The `rule_config` JSONB column stores arbitrary configuration specific
    to each rule_type, enabling extensibility without schema migrations.

    Attributes:
        id: UUID primary key.
        card_id: UUID of the card this rule belongs to.
        rule_name: Human-readable name (e.g., "Swiggy 10% Cashback").
        rule_type: Canonical rule type from RewardRuleType enum.
        priority: Execution priority — lower values are evaluated first.
            Rules with the same priority are order-independent.
        is_active: Whether this rule is currently evaluated by the engine.
        rule_config: JSONB configuration blob. Structure varies by rule_type.
            See docs/REWARD_ENGINE.md for expected shapes.
        created_at: UTC timestamp of creation.
        updated_at: UTC timestamp of last modification.

    Examples:

        Swiggy cashback:
            rule_type = "merchant_bonus"
            rule_config = {
                "merchant": "swiggy",
                "reward_rate": 0.10,
                "reward_type": "cashback",
                "cap": 1500,
            }

        Online spend:
            rule_type = "category_bonus"
            rule_config = {
                "category": "online",
                "reward_rate": 0.05,
            }

        Fuel exclusion:
            rule_type = "exclusion"
            rule_config = {
                "category": "fuel",
                "excluded": True,
            }
    """

    __tablename__ = "reward_rules"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(PG_UUID(), primary_key=True, default=uuid.uuid4),
    )
    card_id: str = Field(
        ...,
        index=True,
        description="UUID of the card this rule belongs to.",
    )
    rule_name: str = Field(
        max_length=255,
        description="Human-readable rule name.",
    )
    rule_type: str = Field(
        max_length=50,
        index=True,
        description="Canonical rule type (enum value from RewardRuleType).",
    )
    priority: int = Field(
        default=0,
        index=True,
        description="Execution priority — lower values evaluated first.",
    )
    is_active: bool = Field(
        default=True,
        index=True,
        description="Whether this rule is active for evaluation.",
    )
    rule_config: dict = Field(
        default_factory=dict,
        sa_column=Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict),
        description="Flexible JSON configuration for this rule.",
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="UTC timestamp of creation.",
    )
    updated_at: datetime | None = Field(
        default=None,
        sa_column_kwargs={"onupdate": datetime.utcnow},
        description="UTC timestamp of last modification.",
    )

    # ---- Table-level Indexes ----
    __table_args__ = (
        # Composite index: fast lookup by card + active status (most common query)
        Index(
            "ix_reward_rules_card_active",
            "card_id",
            "is_active",
        ),
        # Composite index: ordered rules for a card by priority
        Index(
            "ix_reward_rules_card_priority",
            "card_id",
            "priority",
        ),
        # GIN index on rule_config for JSONB queries (e.g., @> operator)
        Index(
            "ix_reward_rules_config_gin",
            "rule_config",
            postgresql_using="gin",
        ),
    )