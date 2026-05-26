"""replace_is_active_with_card_status

Revision ID: 641351fc6835
Revises: a80befd650d6
Create Date: 2026-05-26 23:45:43.471790
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic
revision: str = '641351fc6835'
down_revision: Union[str, None] = 'a80befd650d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Apply migration."""
    # 1. Add column as nullable
    op.add_column('user_cards', sa.Column('card_status', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True))
    
    # 2. Migrate data safely
    op.execute("UPDATE user_cards SET card_status = 'ACTIVE' WHERE is_active = true")
    op.execute("UPDATE user_cards SET card_status = 'INACTIVE' WHERE is_active = false")
    # For any unexpected cases
    op.execute("UPDATE user_cards SET card_status = 'ACTIVE' WHERE card_status IS NULL")

    # 3. Alter column to not null
    op.alter_column('user_cards', 'card_status', nullable=False)

    # 4. Drop old column
    op.drop_column('user_cards', 'is_active')


def downgrade() -> None:
    """Revert migration."""
    # 1. Add column as nullable
    op.add_column('user_cards', sa.Column('is_active', sa.BOOLEAN(), nullable=True))
    
    # 2. Migrate data safely
    op.execute("UPDATE user_cards SET is_active = true WHERE card_status = 'ACTIVE'")
    op.execute("UPDATE user_cards SET is_active = false WHERE card_status != 'ACTIVE'")

    # 3. Alter column to not null
    op.alter_column('user_cards', 'is_active', nullable=False, server_default=sa.text('true'))
    
    # 4. Drop new column
    op.drop_column('user_cards', 'card_status')