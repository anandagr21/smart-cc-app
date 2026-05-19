"""create_card_catalogs_and_user_cards_tables

Revision ID: 4dec70ca1ced
Revises: 1b345519224b
Create Date: 2026-05-19 18:59:51.370964
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic
revision: str = "4dec70ca1ced"
down_revision: Union[str, None] = "1b345519224b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create card_catalogs and user_cards tables."""
    # Card Catalogs table
    op.create_table(
        "card_catalogs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("card_name", sa.String(length=200), nullable=False),
        sa.Column("bank_name", sa.String(length=200), nullable=False),
        sa.Column("network", sa.String(length=50), nullable=False),
        sa.Column(
            "joining_fee",
            sa.Numeric(precision=12, scale=2),
            nullable=False,
            server_default="0.00",
        ),
        sa.Column(
            "annual_fee",
            sa.Numeric(precision=12, scale=2),
            nullable=False,
            server_default="0.00",
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
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
    op.create_index(op.f("ix_card_catalogs_bank_name"), "card_catalogs", ["bank_name"], unique=False)
    op.create_index(op.f("ix_card_catalogs_card_name"), "card_catalogs", ["card_name"], unique=False)

    # User Cards table
    op.create_table(
        "user_cards",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("card_catalog_id", sa.Uuid(), nullable=False),
        sa.Column("nickname", sa.String(length=100), nullable=True),
        sa.Column(
            "credit_limit",
            sa.Numeric(precision=14, scale=2),
            nullable=False,
            server_default="0.00",
        ),
        sa.Column(
            "current_spend",
            sa.Numeric(precision=14, scale=2),
            nullable=False,
            server_default="0.00",
        ),
        sa.Column(
            "annual_spend",
            sa.Numeric(precision=14, scale=2),
            nullable=False,
            server_default="0.00",
        ),
        sa.Column("billing_date", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("due_date", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
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
        sa.ForeignKeyConstraint(["card_catalog_id"], ["card_catalogs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_user_cards_user_id"), "user_cards", ["user_id"], unique=False)
    op.create_index(op.f("ix_user_cards_card_catalog_id"), "user_cards", ["card_catalog_id"], unique=False)


def downgrade() -> None:
    """Drop card_catalogs and user_cards tables."""
    op.drop_table("user_cards")
    op.drop_table("card_catalogs")