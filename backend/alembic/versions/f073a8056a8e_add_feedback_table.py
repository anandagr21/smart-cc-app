"""Add feedback table

Revision ID: f073a8056a8e
Revises: 5471139367d9
Create Date: 2026-06-07 19:40:59.973096
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision: str = 'f073a8056a8e'
down_revision: Union[str, None] = '5471139367d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Apply migration."""
    op.create_table('feedback',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('calculation_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('merchant_name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('transaction_amount', sa.Float(), nullable=False),
    sa.Column('card_id', sa.Uuid(), nullable=False),
    sa.Column('calculated_reward', sa.Float(), nullable=False),
    sa.Column('rule_version', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('issue_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('issue_description', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('calculation_context', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('status', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['card_id'], ['card_catalogs.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_feedback_calculation_id'), 'feedback', ['calculation_id'], unique=False)
    op.create_index(op.f('ix_feedback_id'), 'feedback', ['id'], unique=False)
    op.create_index(op.f('ix_feedback_user_id'), 'feedback', ['user_id'], unique=False)


def downgrade() -> None:
    """Revert migration."""
    op.drop_index(op.f('ix_feedback_user_id'), table_name='feedback')
    op.drop_index(op.f('ix_feedback_id'), table_name='feedback')
    op.drop_index(op.f('ix_feedback_calculation_id'), table_name='feedback')
    op.drop_table('feedback')