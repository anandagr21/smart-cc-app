"""increase hash size

Revision ID: 4af5d5359364
Revises: a15562e62e18
Create Date: 2026-06-09 00:05:27.199650
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic
revision: str = '4af5d5359364'
down_revision: Union[str, None] = 'a15562e62e18'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('card_monitoring', 'last_seen_hash',
               existing_type=sa.String(length=32),
               type_=sa.String(length=64),
               existing_nullable=False)


def downgrade() -> None:
    op.alter_column('card_monitoring', 'last_seen_hash',
               existing_type=sa.String(length=64),
               type_=sa.String(length=32),
               existing_nullable=False)