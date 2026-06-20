"""add composite indexes for transaction query performance

Revision ID: composite_idx_transactions
Revises: 76c5ca706fdc
Create Date: 2026-06-20

This migration adds three composite indexes that dramatically improve the
most common transaction query patterns:

1. ix_transactions_user_date — covers WHERE user_id = ? AND transaction_date BETWEEN ?
2. ix_transactions_card_date — covers WHERE user_card_id = ? ORDER BY transaction_date DESC
3. ix_transactions_card_type_status — covers spend aggregator queries on (card, type, status)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'composite_idx_transactions'
down_revision: Union[str, None] = '76c5ca706fdc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        'ix_transactions_user_date',
        'transactions',
        ['user_id', 'transaction_date'],
    )
    op.create_index(
        'ix_transactions_card_date',
        'transactions',
        ['user_card_id', 'transaction_date'],
    )
    op.create_index(
        'ix_transactions_card_type_status',
        'transactions',
        ['user_card_id', 'transaction_type', 'status'],
    )


def downgrade() -> None:
    op.drop_index('ix_transactions_card_type_status', table_name='transactions')
    op.drop_index('ix_transactions_card_date', table_name='transactions')
    op.drop_index('ix_transactions_user_date', table_name='transactions')
