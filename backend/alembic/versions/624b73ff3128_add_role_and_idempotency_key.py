"""Add role and idempotency_key

Revision ID: 624b73ff3128
Revises: 41a3cc3eb1cc
Create Date: 2026-06-06 01:47:13.445790
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision: str = '624b73ff3128'
down_revision: Union[str, None] = '41a3cc3eb1cc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Apply migration."""
    op.add_column('transactions', sa.Column('idempotency_key', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True))
    op.create_unique_constraint('uix_user_id_idempotency_key', 'transactions', ['user_id', 'idempotency_key'])
    op.add_column('users', sa.Column('role', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default='USER'))


def downgrade() -> None:
    """Revert migration."""
    op.drop_column('users', 'role')
    op.drop_constraint('uix_user_id_idempotency_key', 'transactions', type_='unique')
    op.drop_column('transactions', 'idempotency_key')