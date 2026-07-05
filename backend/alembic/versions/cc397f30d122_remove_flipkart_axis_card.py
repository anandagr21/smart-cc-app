"""remove_flipkart_axis_card

Revision ID: cc397f30d122
Revises: 8a3c2f1d4b55
Create Date: 2026-07-06 00:53:57.011146
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic
revision: str = 'cc397f30d122'
down_revision: Union[str, None] = '8a3c2f1d4b55'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Apply migration."""
    conn = op.get_bind()
    result = conn.execute(
        sa.text("SELECT id FROM card_catalogs WHERE card_name = 'Flipkart Axis Bank Credit Card'")
    ).fetchone()
    
    if result:
        old_id = result[0]
        # Update any user_cards that had this card
        conn.execute(
            sa.text("UPDATE user_cards SET card_catalog_id = '6981880c-1d3a-464d-bc35-0b32e26e520f' WHERE card_catalog_id = :old_id"),
            {"old_id": old_id}
        )
        # Delete the old card from card_catalogs
        conn.execute(
            sa.text("DELETE FROM card_catalogs WHERE id = :old_id"),
            {"old_id": old_id}
        )


def downgrade() -> None:
    """Revert migration."""
    pass