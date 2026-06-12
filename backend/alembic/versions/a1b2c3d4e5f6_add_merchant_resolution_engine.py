"""add merchant resolution engine tables

Revision ID: a1b2c3d4e5f6
Revises: 5e7a8b9c0d1e
Create Date: 2026-06-12

Adds:
- merchant_alias_learning table
- merchant_pending_review table
- merchant_resolution_metrics table
- merchants.merchant_type column
- merchants.mcc_hint column
- merchant_aliases.confidence column
- merchant_aliases.source values updated (SYSTEM, LLM, USER_CONFIRMED)
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'a1b2c3d4e5f6'
down_revision = '005d06487c25'
branch_labels = None
depends_on = None



def upgrade() -> None:
    # ── 1. Extend merchants table ──────────────────────────────────────────
    op.add_column(
        'merchants',
        sa.Column('merchant_type', sa.String(50), nullable=False, server_default='UNKNOWN'),
    )
    op.add_column(
        'merchants',
        sa.Column('mcc_hint', sa.String(10), nullable=True),
    )
    op.create_index('ix_merchants_merchant_type_idx', 'merchants', ['merchant_type'])

    # ── 2. Extend merchant_aliases table ──────────────────────────────────
    op.add_column(
        'merchant_aliases',
        sa.Column('confidence', sa.Float(), nullable=False, server_default='1.0'),
    )
    # Update source column default (existing rows keep their value)
    op.alter_column(
        'merchant_aliases',
        'source',
        existing_type=sa.String(50),
        server_default='SYSTEM',
    )

    # ── 3. merchant_alias_learning ─────────────────────────────────────────
    op.create_table(
        'merchant_alias_learning',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('alias', sa.String(500), nullable=False),
        sa.Column('normalized_alias', sa.String(300), nullable=False),
        sa.Column('merchant_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('confirmation_count', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('last_confirmed_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['merchant_id'], ['merchants.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('normalized_alias', 'merchant_id', name='uq_alias_learning_norm_merchant'),
    )
    op.create_index('ix_alias_learning_alias', 'merchant_alias_learning', ['alias'])
    op.create_index('ix_alias_learning_normalized', 'merchant_alias_learning', ['normalized_alias'])
    op.create_index('ix_alias_learning_merchant_id', 'merchant_alias_learning', ['merchant_id'])

    # ── 4. merchant_pending_review ────────────────────────────────────────
    op.create_table(
        'merchant_pending_review',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('raw_input', sa.String(500), nullable=False),
        sa.Column('suggested_name', sa.String(500), nullable=False),
        sa.Column('category', sa.String(50), nullable=False, server_default='unknown'),
        sa.Column('subcategory', sa.String(100), nullable=True),
        sa.Column('merchant_type', sa.String(50), nullable=False, server_default='UNKNOWN'),
        sa.Column('mcc_hint', sa.String(10), nullable=True),
        sa.Column('is_known_brand', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='PENDING'),
        sa.Column('admin_notes', sa.String(1000), nullable=True),
        sa.Column('approved_merchant_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_merchant_pending_review_status', 'merchant_pending_review', ['status'])

    # ── 5. merchant_resolution_metrics ───────────────────────────────────
    op.create_table(
        'merchant_resolution_metrics',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('raw_input', sa.String(500), nullable=False),
        sa.Column('normalized_input', sa.String(300), nullable=False),
        sa.Column('resolution_type', sa.String(50), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('fuzzy_score', sa.Float(), nullable=True),
        sa.Column('llm_called', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('cache_hit', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('merchant_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=False),
    )
    op.create_index(
        'ix_resolution_metrics_type_date',
        'merchant_resolution_metrics',
        ['resolution_type', 'resolved_at'],
    )
    op.create_index(
        'ix_resolution_metrics_resolved_at',
        'merchant_resolution_metrics',
        ['resolved_at'],
    )


def downgrade() -> None:
    op.drop_table('merchant_resolution_metrics')
    op.drop_table('merchant_pending_review')
    op.drop_index('ix_alias_learning_merchant_id', table_name='merchant_alias_learning')
    op.drop_index('ix_alias_learning_normalized', table_name='merchant_alias_learning')
    op.drop_index('ix_alias_learning_alias', table_name='merchant_alias_learning')
    op.drop_table('merchant_alias_learning')
    op.drop_column('merchant_aliases', 'confidence')
    op.drop_index('ix_merchants_merchant_type_idx', table_name='merchants')
    op.drop_column('merchants', 'mcc_hint')
    op.drop_column('merchants', 'merchant_type')
