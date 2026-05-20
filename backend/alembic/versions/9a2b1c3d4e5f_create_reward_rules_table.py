"""create_reward_rules_table

Revision ID: 9a2b1c3d4e5f
Revises: 5e7a8b9c0d1e
Create Date: 2026-05-20

This migration creates the `reward_rules` table for storing flexible,
JSONB-backed reward rule configurations.

Table: reward_rules
- id: Primary key (UUID)
- card_id: Foreign key to card_catalog (UUID, NOT NULL, indexed)
- rule_name: Human-readable rule identifier (VARCHAR, NOT NULL)
- rule_type: Enum string — one of the supported RewardRuleType values (VARCHAR, NOT NULL, indexed)
- priority: Integer priority for rule evaluation ordering (INTEGER, default 0)
- is_active: Soft-delete / toggle flag (BOOLEAN, default true, indexed)
- rule_config: Flexible JSONB payload for rule parameters (JSONB, NOT NULL)
- created_at: Timestamp (TIMESTAMPTZ, default now())
- updated_at: Timestamp (TIMESTAMPTZ, auto-updated via trigger)
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "9a2b1c3d4e5f"
down_revision: Union[str, None] = "5e7a8b9c0d1e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the reward_rules table with proper constraints and indexes."""

    # Create the reward_rule_type enum if it doesn't exist
    # Using VARCHAR instead of ENUM for flexibility with JSONB approach
    op.create_table(
        "reward_rules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("card_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("rule_name", sa.String(length=255), nullable=False),
        sa.Column("rule_type", sa.String(length=50), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("rule_config", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
    )

    # Indexes
    op.create_index("ix_reward_rules_card_id", "reward_rules", ["card_id"])
    op.create_index("ix_reward_rules_rule_type", "reward_rules", ["rule_type"])
    op.create_index("ix_reward_rules_is_active", "reward_rules", ["is_active"])
    op.create_index("ix_reward_rules_card_active", "reward_rules", ["card_id", "is_active"])
    op.create_index("ix_reward_rules_card_type_active", "reward_rules", ["card_id", "rule_type", "is_active"])

    # GIN index on rule_config JSONB for efficient JSON queries
    op.create_index(
        "ix_reward_rules_rule_config_gin",
        "reward_rules",
        ["rule_config"],
        postgresql_using="gin",
    )

    # Foreign key to card_catalog
    op.create_foreign_key(
        "fk_reward_rules_card_id",
        "reward_rules",
        "card_catalog",
        ["card_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    """Drop the reward_rules table."""
    op.drop_table("reward_rules")