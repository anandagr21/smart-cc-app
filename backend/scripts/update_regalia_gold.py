import asyncio
import os
import sys
import json
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from sqlalchemy import select
from core.database import async_session_factory
from models.card_catalog import CardCatalog

REGALIA_RULES = [
    {"category_name": "Myntra", "reward_type": "points", "multiplier": 12.5, "merchant_exclusions": []},
    {"category_name": "Marks & Spencer", "reward_type": "points", "multiplier": 12.5, "merchant_exclusions": []},
    {"category_name": "Reliance Digital", "reward_type": "points", "multiplier": 12.5, "merchant_exclusions": []},
    {"category_name": "Nykaa", "reward_type": "points", "multiplier": 12.5, "merchant_exclusions": []},
    {"category_name": "Flights", "reward_type": "points", "multiplier": 25, "merchant_exclusions": []},
    {"category_name": "Hotels", "reward_type": "points", "multiplier": 25, "merchant_exclusions": []},
    {"category_name": "Utilities", "reward_type": "points", "multiplier": 2.5, "merchant_exclusions": []},
    {"category_name": "Insurance", "reward_type": "points", "multiplier": 2.5, "merchant_exclusions": []},
    {"category_name": "Education", "reward_type": "points", "multiplier": 2.5, "merchant_exclusions": []},
    {"category_name": "All Other Spends", "reward_type": "points", "multiplier": 2.5, "merchant_exclusions": []}
]

async def main():
    async with async_session_factory() as db:
        res = await db.execute(select(CardCatalog).where(CardCatalog.card_name == "HDFC Regalia Gold"))
        card = res.scalar_one_or_none()
        if card:
            card.reward_rules_json = {"rules": REGALIA_RULES}
            db.add(card)
            await db.commit()
            print("Successfully updated HDFC Regalia Gold rules.")
        else:
            print("HDFC Regalia Gold card not found in database.")

asyncio.run(main())
