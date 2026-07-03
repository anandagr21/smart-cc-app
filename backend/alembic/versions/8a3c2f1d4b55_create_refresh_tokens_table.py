"""create_refresh_tokens_table

Revision ID: 8a3c2f1d4b55
Revises: fbb5f99f6698
Create Date: 2026-07-03 23:50:00.000000

This migration actually creates the refresh_tokens table. The previous
revision (fbb5f99f6698) was stamped as a no-op in production — this
migration uses IF NOT EXISTS so it's safe even if the table was already
created manually or by init_db() in dev.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic
revision: str = '8a3c2f1d4b55'
down_revision: Union[str, None] = 'fbb5f99f6698'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create refresh_tokens table if it doesn't already exist."""
    op.execute("""
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id),
            token_family VARCHAR(64) NOT NULL,
            jti VARCHAR(64) NOT NULL UNIQUE,
            is_used BOOLEAN NOT NULL DEFAULT FALSE,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_refresh_tokens_user_id "
        "ON refresh_tokens (user_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_refresh_tokens_token_family "
        "ON refresh_tokens (token_family)"
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_refresh_tokens_jti "
        "ON refresh_tokens (jti)"
    )


def downgrade() -> None:
    """Drop refresh_tokens table."""
    op.drop_index("ix_refresh_tokens_jti", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_token_family", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_user_id", table_name="refresh_tokens")
    op.drop_table("refresh_tokens")
