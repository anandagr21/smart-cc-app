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
    """Consolidate duplicate Flipkart Axis cards and fix incorrect data."""
    conn = op.get_bind()

    # Find all Flipkart Axis catalog entries
    result = conn.execute(
        sa.text(
            "SELECT id, card_name, fee_waiver_spend_threshold, annual_fee, is_approved "
            "FROM card_catalogs "
            "WHERE card_name ILIKE '%flipkart%axis%' OR card_name ILIKE '%axis%flipkart%' "
            "ORDER BY is_approved DESC, annual_fee ASC"
        )
    ).fetchall()

    if len(result) == 0:
        return  # Nothing to do

    if len(result) == 1:
        # No duplicates — just fix the fee_waiver_spend_threshold if it's wrong (50k)
        card = result[0]
        if card.fee_waiver_spend_threshold == 50000:
            conn.execute(
                sa.text(
                    "UPDATE card_catalogs "
                    "SET fee_waiver_spend_threshold = 350000.00 "
                    "WHERE id = :card_id"
                ),
                {"card_id": card.id}
            )
        return

    # Multiple Flipkart Axis cards — consolidate into the approved one
    # Pick the best card: approved first, then lower annual_fee
    keep = result[0]  # sorted by is_approved DESC, annual_fee ASC

    for card in result[1:]:
        # Move any user_cards referencing the duplicate to the canonical card
        conn.execute(
            sa.text(
                "UPDATE user_cards SET card_catalog_id = :keep_id "
                "WHERE card_catalog_id = :dupe_id"
            ),
            {"keep_id": keep.id, "dupe_id": card.id}
        )
        # Delete the duplicate catalog entry
        conn.execute(
            sa.text("DELETE FROM card_catalogs WHERE id = :dupe_id"),
            {"dupe_id": card.id}
        )

    # Ensure the kept card has correct data
    conn.execute(
        sa.text(
            "UPDATE card_catalogs "
            "SET fee_waiver_spend_threshold = 350000.00, annual_fee = 500.00 "
            "WHERE id = :keep_id"
        ),
        {"keep_id": keep.id}
    )


def downgrade() -> None:
    """Revert migration — no-op, data cleanup cannot be reversed."""
    pass
