"""add_kiwi_card

Revision ID: 50122df20dc3
Revises: cc397f30d122
Create Date: 2026-07-06T01:00:40.289143
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import json
import uuid

revision = '50122df20dc3'
down_revision = 'cc397f30d122'
branch_labels = None
depends_on = None

def upgrade():
    op.execute(
        sa.text("""
            INSERT INTO card_catalogs (
                id, bank_name, card_name, network, annual_fee, joining_fee, 
                reward_rules_json, fee_waiver_spend_threshold,
                is_active, base_point_value, is_approved, created_at, updated_at
            ) VALUES (
                CAST(:id AS UUID), :bank_name, :card_name, :network, :annual_fee, :joining_fee,
                CAST(:reward_rules_json AS JSONB), :fee_waiver_spend_threshold,
                :is_active, 1.0, True, NOW(), NOW()
            )
            ON CONFLICT (id) DO NOTHING;
        """).bindparams(
            id='f3f3e1a0-5b12-4d32-9c02-e2c3459c00ab',
            bank_name='Yes Bank',
            card_name='Yes Bank Kiwi RuPay Credit Card',
            network='RuPay',
            annual_fee=0.00,
            joining_fee=0.00,
            reward_rules_json='{"rules": [{"category_name": "UPI transactions (with Kiwi Neon)", "multiplier": 5.0, "reward_type": "cashback", "has_cap": false, "cap_limit": null, "merchant_exclusions": []}, {"category_name": "Non-UPI spends (via Kiwi app)", "multiplier": 1.5, "reward_type": "cashback", "has_cap": false, "cap_limit": null, "merchant_exclusions": []}, {"category_name": "Base rewards (via Kiwi app)", "multiplier": 1.5, "reward_type": "cashback", "has_cap": false, "cap_limit": null, "merchant_exclusions": []}], "validation_required": true, "raw_sources": ["https://www.knowyourfinance.org/cards/card/kiwi-yes-bank-rupay", "https://www.banksathi.com/credit-cards/yes-bank/kiwi", "https://cardmaven.in/kiwi-rupay-credit-card-review/"]}',
            fee_waiver_spend_threshold=0,
            is_active=True
        )
    )

def downgrade():
    op.execute("DELETE FROM card_catalogs WHERE card_name = 'Yes Bank Kiwi RuPay Credit Card'")
