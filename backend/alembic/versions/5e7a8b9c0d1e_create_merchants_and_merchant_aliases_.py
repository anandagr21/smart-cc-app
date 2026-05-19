"""create_merchants_and_merchant_aliases_tables

Revision ID: 5e7a8b9c0d1e
Revises: 4dec70ca1ced
Create Date: 2026-05-19 20:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "5e7a8b9c0d1e"
down_revision: Union[str, None] = "4dec70ca1ced"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create merchants and merchant_aliases tables."""
    # Merchants table — canonical merchant identities
    op.create_table(
        "merchants",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("canonical_name", sa.String(length=300), nullable=False),
        sa.Column("display_name", sa.String(length=500), nullable=False),
        sa.Column(
            "category",
            sa.String(length=50),
            nullable=False,
            server_default="unknown",
        ),
        sa.Column(
            "normalized_tokens",
            postgresql.JSONB(),
            nullable=False,
        ),
        sa.Column(
            "aliases_list",
            postgresql.JSONB(),
            nullable=False,
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_merchants_canonical_name"),
        "merchants",
        ["canonical_name"],
        unique=True,
    )
    op.create_index(
        op.f("ix_merchants_category_idx"),
        "merchants",
        ["category"],
        unique=False,
    )
    op.create_index(
        "ix_merchants_normalized_tokens_gin",
        "merchants",
        ["normalized_tokens"],
        postgresql_using="gin",
    )

    # Merchant Aliases table — alternate merchant names
    op.create_table(
        "merchant_aliases",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("merchant_id", sa.Uuid(), nullable=False),
        sa.Column("raw_name", sa.String(length=500), nullable=False),
        sa.Column("normalized_name", sa.String(length=300), nullable=False),
        sa.Column(
            "normalized_tokens",
            postgresql.JSONB(),
            nullable=False,
        ),
        sa.Column(
            "source",
            sa.String(length=50),
            nullable=False,
            server_default="manual",
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["merchant_id"],
            ["merchants.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "merchant_id",
            "normalized_name",
            name="uq_alias_merchant_normalized",
        ),
    )
    op.create_index(
        op.f("ix_merchant_aliases_normalized_name"),
        "merchant_aliases",
        ["normalized_name"],
        unique=False,
    )
    op.create_index(
        op.f("ix_merchant_aliases_merchant_id"),
        "merchant_aliases",
        ["merchant_id"],
        unique=False,
    )
    op.create_index(
        "ix_merchant_aliases_normalized_tokens_gin",
        "merchant_aliases",
        ["normalized_tokens"],
        postgresql_using="gin",
    )


def downgrade() -> None:
    """Drop merchants and merchant_aliases tables."""
    op.drop_table("merchant_aliases")
    op.drop_table("merchants")