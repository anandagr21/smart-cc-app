"""add terms_accepted to user

Revision ID: 005d06487c25
Revises: b98e8dba5b51
Create Date: 2026-06-11 19:26:55.776107
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision: str = '005d06487c25'
down_revision: Union[str, None] = 'b98e8dba5b51'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Apply migration."""
    op.add_column('users', sa.Column('terms_accepted', sa.Boolean(), nullable=False, server_default=sa.text("false")))
    # ### end Alembic commands ###

def downgrade() -> None:
    """Revert migration."""
    op.drop_column('users', 'terms_accepted')
    # ### end Alembic commands ###