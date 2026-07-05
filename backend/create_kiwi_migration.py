import asyncio
from core.database import async_session_factory
from models.card_catalog import CardCatalog
from sqlalchemy import select
from datetime import datetime
import json
import uuid

async def main():
    async with async_session_factory() as session:
        result = await session.execute(select(CardCatalog).where(CardCatalog.card_name.like("%Yes Bank Kiwi%")))
        card = result.scalar_one_or_none()
        if card:
            # Generate alembic revision file
            rev = uuid.uuid4().hex[:12]
            filename = f"alembic/versions/{rev}_add_kiwi_card.py"
            
            # format fields
            reward_rules_json_str = json.dumps(card.reward_rules_json) if card.reward_rules_json else "None"
            features_json_str = json.dumps(card.features_json) if card.features_json else "None"
            
            with open(filename, "w") as f:
                f.write(f'''"""add_kiwi_card

Revision ID: {rev}
Revises: cc397f30d122
Create Date: {datetime.now().isoformat()}
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import json
import uuid

revision = '{rev}'
down_revision = 'cc397f30d122'
branch_labels = None
depends_on = None

def upgrade():
    op.execute(
        sa.text("""
            INSERT INTO card_catalogs (
                id, bank_name, card_name, network, annual_fee, joining_fee, 
                reward_type, reward_rules_json, fee_waiver_spend_threshold,
                is_active, created_at, updated_at
            ) VALUES (
                :id, :bank_name, :card_name, :network, :annual_fee, :joining_fee,
                :reward_type, :reward_rules_json, :fee_waiver_spend_threshold,
                :is_active, NOW(), NOW()
            )
            ON CONFLICT (id) DO NOTHING;
        """).bindparams(
            id=str(uuid.uuid4()),
            bank_name={repr(card.bank_name)},
            card_name={repr(card.card_name)},
            network={repr(card.network)},
            annual_fee={card.annual_fee},
            joining_fee={card.joining_fee},
            reward_type='CASHBACK',
            reward_rules_json=json.dumps({reward_rules_json_str}),
            fee_waiver_spend_threshold={card.fee_waiver_spend_threshold if card.fee_waiver_spend_threshold else 0},
            is_active=True
        )
    )

def downgrade():
    op.execute("DELETE FROM card_catalogs WHERE card_name = {repr(card.card_name)}")
''')
            print(f"Migration created: {filename}")
        else:
            print("Card not found in database.")

asyncio.run(main())
