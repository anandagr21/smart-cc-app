import asyncio
import os
import sys
import json
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from sqlalchemy import select
from core.database import async_session_factory
from models.card_catalog import CardCatalog

RULES = {
    "Cashback SBI Card": [
        {"category_name": "Online Spends", "reward_type": "cashback", "multiplier": 5, "merchant_exclusions": []},
        {"category_name": "All Other Spends", "reward_type": "cashback", "multiplier": 1, "merchant_exclusions": []}
    ],
    "Axis Ace Credit Card": [
        {"category_name": "Utility", "reward_type": "cashback", "multiplier": 5, "merchant_exclusions": []},
        {"category_name": "Swiggy", "reward_type": "cashback", "multiplier": 4, "merchant_exclusions": []},
        {"category_name": "Zomato", "reward_type": "cashback", "multiplier": 4, "merchant_exclusions": []},
        {"category_name": "Ola", "reward_type": "cashback", "multiplier": 4, "merchant_exclusions": []},
        {"category_name": "All Other Spends", "reward_type": "cashback", "multiplier": 2, "merchant_exclusions": []}
    ],
    "HDFC Millennia Credit Card": [
        {"category_name": "Amazon", "reward_type": "cashback", "multiplier": 5, "merchant_exclusions": []},
        {"category_name": "Flipkart", "reward_type": "cashback", "multiplier": 5, "merchant_exclusions": []},
        {"category_name": "Myntra", "reward_type": "cashback", "multiplier": 5, "merchant_exclusions": []},
        {"category_name": "Swiggy", "reward_type": "cashback", "multiplier": 5, "merchant_exclusions": []},
        {"category_name": "Zomato", "reward_type": "cashback", "multiplier": 5, "merchant_exclusions": []},
        {"category_name": "All Other Spends", "reward_type": "cashback", "multiplier": 1, "merchant_exclusions": []}
    ],
    "SBI Card PRIME": [
        {"category_name": "Dining", "reward_type": "points", "multiplier": 10, "merchant_exclusions": []},
        {"category_name": "Grocery", "reward_type": "points", "multiplier": 10, "merchant_exclusions": []},
        {"category_name": "Movies", "reward_type": "points", "multiplier": 10, "merchant_exclusions": []},
        {"category_name": "All Other Spends", "reward_type": "points", "multiplier": 2, "merchant_exclusions": []}
    ],
    "Axis Atlas Credit Card": [
        {"category_name": "Travel", "reward_type": "points", "multiplier": 5, "merchant_exclusions": []},
        {"category_name": "All Other Spends", "reward_type": "points", "multiplier": 2, "merchant_exclusions": []}
    ],
    "Amex Platinum Travel": [
        {"category_name": "All Other Spends", "reward_type": "points", "multiplier": 1, "merchant_exclusions": []}
    ],
    "HDFC Infinia Metal Edition": [
        {"category_name": "Travel", "reward_type": "points", "multiplier": 10, "merchant_exclusions": []},
        {"category_name": "Dining", "reward_type": "points", "multiplier": 10, "merchant_exclusions": []},
        {"category_name": "All Other Spends", "reward_type": "points", "multiplier": 5, "merchant_exclusions": []}
    ],
    "HDFC Regalia Gold": [
        {"category_name": "Retail", "reward_type": "points", "multiplier": 4, "merchant_exclusions": []},
        {"category_name": "All Other Spends", "reward_type": "points", "multiplier": 4, "merchant_exclusions": []}
    ],
    "Amex Platinum Reserve": [
        {"category_name": "All Other Spends", "reward_type": "points", "multiplier": 1, "merchant_exclusions": []}
    ],
    "ICICI Emeralde Credit Card": [
        {"category_name": "All Other Spends", "reward_type": "points", "multiplier": 4, "merchant_exclusions": []}
    ],
    "SBI SimplyCLICK": [
        {"category_name": "Amazon", "reward_type": "points", "multiplier": 10, "merchant_exclusions": []},
        {"category_name": "Cleartrip", "reward_type": "points", "multiplier": 10, "merchant_exclusions": []},
        {"category_name": "Online Spends", "reward_type": "points", "multiplier": 5, "merchant_exclusions": []},
        {"category_name": "All Other Spends", "reward_type": "points", "multiplier": 1, "merchant_exclusions": []}
    ],
    "ICICI Coral Credit Card": [
        {"category_name": "Dining", "reward_type": "points", "multiplier": 2, "merchant_exclusions": []},
        {"category_name": "All Other Spends", "reward_type": "points", "multiplier": 2, "merchant_exclusions": []}
    ],
    "Kotak Zen Signature": [
        {"category_name": "All Other Spends", "reward_type": "points", "multiplier": 5, "merchant_exclusions": []}
    ],
    "Amex MRCC": [
        {"category_name": "All Other Spends", "reward_type": "points", "multiplier": 2, "merchant_exclusions": []}
    ]
}

async def main():
    async with async_session_factory() as db:
        res = await db.execute(select(CardCatalog))
        cards = res.scalars().all()
        for card in cards:
            if card.card_name in RULES:
                # Wrap it in 'rules' key to match parse_rules_from_catalog expectations
                card.reward_rules_json = {"rules": RULES[card.card_name]}
                db.add(card)
        await db.commit()
        print("Updated reward rules for common cards.")

asyncio.run(main())
