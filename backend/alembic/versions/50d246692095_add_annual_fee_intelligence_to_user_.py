"""add annual fee intelligence to user_cards

Revision ID: 50d246692095
Revises: 9a2b1c3d4e5f
Create Date: 2026-05-26 10:39:34.609824
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic
revision: str = '50d246692095'
down_revision: Union[str, None] = '9a2b1c3d4e5f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Apply migration."""
    op.add_column('user_cards', sa.Column('user_override_annual_fee', sa.Numeric(precision=12, scale=2), nullable=True))
    op.add_column('user_cards', sa.Column('fee_override_updated_at', sa.DateTime(), nullable=True))
    op.add_column('user_cards', sa.Column('fee_override_source', sa.String(length=50), nullable=True))


def downgrade() -> None:
    """Revert migration."""
    op.drop_column('user_cards', 'fee_override_source')
    op.drop_column('user_cards', 'fee_override_updated_at')
    op.drop_column('user_cards', 'user_override_annual_fee')