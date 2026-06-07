"""add updated_at to transactions

Revision ID: dfd00a1a401d
Revises: 5c960bb692be
Create Date: 2026-06-07 22:31:47.409834
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision: str = 'dfd00a1a401d'
down_revision: Union[str, None] = '5c960bb692be'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Apply migration."""
    op.add_column('transactions', sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False))

def downgrade() -> None:
    """Revert migration."""
    op.drop_column('transactions', 'updated_at')