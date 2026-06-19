import asyncio
import os
import sys
from decimal import Decimal
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from sqlalchemy import select
from core.database import async_session_factory
from models.card_catalog import CardCatalog

FLIPKART_SBI_RULES = [
    {"category_name": "Flipkart", "reward_type": "cashback", "multiplier": 5, "merchant_exclusions": [], "has_cap": True, "cap_limit": 4000, "cap_cycle": "monthly"},
    {"category_name": "Minutes", "reward_type": "cashback", "multiplier": 5, "merchant_exclusions": [], "has_cap": True, "cap_limit": 4000, "cap_cycle": "monthly"},
    {"category_name": "Groceries", "reward_type": "cashback", "multiplier": 5, "merchant_exclusions": [], "has_cap": True, "cap_limit": 4000, "cap_cycle": "monthly"},
    {"category_name": "Shopsy", "reward_type": "cashback", "multiplier": 5, "merchant_exclusions": [], "has_cap": True, "cap_limit": 4000, "cap_cycle": "monthly"},
    {"category_name": "Myntra", "reward_type": "cashback", "multiplier": 7.5, "merchant_exclusions": [], "has_cap": True, "cap_limit": 4000, "cap_cycle": "monthly"},
    {"category_name": "Cleartrip", "reward_type": "cashback", "multiplier": 5, "merchant_exclusions": []},
    {"category_name": "Uber", "reward_type": "cashback", "multiplier": 4, "merchant_exclusions": [], "has_cap": True, "cap_limit": 4000, "cap_cycle": "monthly"},
    {"category_name": "Zomato", "reward_type": "cashback", "multiplier": 4, "merchant_exclusions": [], "has_cap": True, "cap_limit": 4000, "cap_cycle": "monthly"},
    {"category_name": "Netmeds", "reward_type": "cashback", "multiplier": 4, "merchant_exclusions": [], "has_cap": True, "cap_limit": 4000, "cap_cycle": "monthly"},
    {"category_name": "PVR", "reward_type": "cashback", "multiplier": 4, "merchant_exclusions": [], "has_cap": True, "cap_limit": 4000, "cap_cycle": "monthly"},
    {"category_name": "All Other Spends", "reward_type": "cashback", "multiplier": 1, "merchant_exclusions": []}
]

async def main():
    async with async_session_factory() as db:
        res = await db.execute(select(CardCatalog).where(CardCatalog.card_name == "Flipkart SBI Card"))
        card = res.scalar_one_or_none()
        if card:
            card.reward_rules_json = {"rules": FLIPKART_SBI_RULES}
            card.annual_fee = Decimal("500.00")
            card.joining_fee = Decimal("500.00")
            card.fee_waiver_spend_threshold = Decimal("350000.00")
            db.add(card)
            await db.commit()
            print("Successfully updated Flipkart SBI Card details.")
        else:
            print("Flipkart SBI Card not found in database.")

asyncio.run(main())
