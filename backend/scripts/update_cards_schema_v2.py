import asyncio
import os
import sys
from decimal import Decimal
import json

sys.path.append(os.path.join(os.getcwd(), 'backend'))
from sqlalchemy import select
from core.database import async_session_factory
from models.card_catalog import CardCatalog

# 1. Axis Ace
AXIS_ACE_RULES = [
    {"category_name": "Utility", "reward_type": "CASHBACK", "cashback_percent": 5, "has_cap": True, "cap_limit": 500, "cap_cycle": "monthly"},
    {"category_name": "Swiggy", "reward_type": "CASHBACK", "cashback_percent": 4, "has_cap": True, "cap_limit": 500, "cap_cycle": "monthly"},
    {"category_name": "Zomato", "reward_type": "CASHBACK", "cashback_percent": 4, "has_cap": True, "cap_limit": 500, "cap_cycle": "monthly"},
    {"category_name": "Ola", "reward_type": "CASHBACK", "cashback_percent": 4, "has_cap": True, "cap_limit": 500, "cap_cycle": "monthly"},
    {"category_name": "All Other Spends", "reward_type": "CASHBACK", "cashback_percent": 1.5}
]

# 2. SBI Card PRIME
SBI_PRIME_RULES = [
    {"category_name": "Dining", "reward_type": "POINTS", "points": 10, "spend_unit": 100},
    {"category_name": "Grocery", "reward_type": "POINTS", "points": 10, "spend_unit": 100},
    {"category_name": "Movies", "reward_type": "POINTS", "points": 10, "spend_unit": 100},
    {"category_name": "Utility", "reward_type": "POINTS", "points": 20, "spend_unit": 100, "has_cap": True, "cap_limit": 3000, "cap_cycle": "monthly"},
    {"category_name": "Birthday", "reward_type": "POINTS", "points": 20, "spend_unit": 100},
    {"category_name": "All Other Spends", "reward_type": "POINTS", "points": 2, "spend_unit": 100}
]

# 3. HDFC Millennia
HDFC_MILLENNIA_RULES = [
    {"category_name": "Amazon", "reward_type": "CASHBACK", "cashback_percent": 5, "has_cap": True, "cap_limit": 1000, "cap_cycle": "monthly"},
    {"category_name": "BookMyShow", "reward_type": "CASHBACK", "cashback_percent": 5, "has_cap": True, "cap_limit": 1000, "cap_cycle": "monthly"},
    {"category_name": "Cult.fit", "reward_type": "CASHBACK", "cashback_percent": 5, "has_cap": True, "cap_limit": 1000, "cap_cycle": "monthly"},
    {"category_name": "Flipkart", "reward_type": "CASHBACK", "cashback_percent": 5, "has_cap": True, "cap_limit": 1000, "cap_cycle": "monthly"},
    {"category_name": "Myntra", "reward_type": "CASHBACK", "cashback_percent": 5, "has_cap": True, "cap_limit": 1000, "cap_cycle": "monthly"},
    {"category_name": "Sony LIV", "reward_type": "CASHBACK", "cashback_percent": 5, "has_cap": True, "cap_limit": 1000, "cap_cycle": "monthly"},
    {"category_name": "Swiggy", "reward_type": "CASHBACK", "cashback_percent": 5, "has_cap": True, "cap_limit": 1000, "cap_cycle": "monthly"},
    {"category_name": "Tata CLiQ", "reward_type": "CASHBACK", "cashback_percent": 5, "has_cap": True, "cap_limit": 1000, "cap_cycle": "monthly"},
    {"category_name": "Uber", "reward_type": "CASHBACK", "cashback_percent": 5, "has_cap": True, "cap_limit": 1000, "cap_cycle": "monthly"},
    {"category_name": "Zomato", "reward_type": "CASHBACK", "cashback_percent": 5, "has_cap": True, "cap_limit": 1000, "cap_cycle": "monthly"},
    {"category_name": "All Other Spends", "reward_type": "CASHBACK", "cashback_percent": 1}
]

# 4. ICICI Emeralde
ICICI_EMERALDE_RULES = [
    {"category_name": "Utilities", "reward_type": "POINTS", "points": 1, "spend_unit": 100},
    {"category_name": "Insurance", "reward_type": "POINTS", "points": 1, "spend_unit": 100},
    {"category_name": "All Other Spends", "reward_type": "POINTS", "points": 4, "spend_unit": 100}
]

# 5. Amex MRCC
AMEX_MRCC_RULES = [
    {"category_name": "Reward Multiplier", "reward_type": "POINTS", "points": 2, "spend_unit": 50},
    {"category_name": "All Other Spends", "reward_type": "POINTS", "points": 1, "spend_unit": 50}
]
AMEX_MRCC_MILESTONES = {
    "milestones": [
        {"transaction_count": 4, "transaction_amount": 1500, "bonus_points": 1000, "period": "MONTHLY"},
        {"spend_threshold": 20000, "bonus_points": 1000, "period": "MONTHLY"},
        {"spend_threshold": 150000, "fee_waiver": True, "period": "ANNUAL"},
        {"spend_threshold": 90000, "fee_waiver_percent": 50, "period": "ANNUAL"}
    ]
}

# 6. Kotak Zen Signature
KOTAK_ZEN_RULES = [
    {"category_name": "Apparel", "reward_type": "POINTS", "points": 10, "spend_unit": 150},
    {"category_name": "Jewellery", "reward_type": "POINTS", "points": 10, "spend_unit": 150},
    {"category_name": "Lifestyle", "reward_type": "POINTS", "points": 10, "spend_unit": 150},
    {"category_name": "Departmental Stores", "reward_type": "POINTS", "points": 10, "spend_unit": 150},
    {"category_name": "All Other Spends", "reward_type": "POINTS", "points": 5, "spend_unit": 150}
]

# 7. Amex Platinum Travel
AMEX_PLATINUM_TRAVEL_RULES = [
    {"category_name": "All Other Spends", "reward_type": "POINTS", "points": 1, "spend_unit": 50}
]
AMEX_PLATINUM_TRAVEL_MILESTONES = {
    "milestones": [
        {"spend_threshold": 190000, "bonus_points": 15000, "bonus_voucher_value": 4500, "period": "ANNUAL"},
        {"spend_threshold": 400000, "bonus_points": 25000, "bonus_voucher_value": 10000, "period": "ANNUAL"}
    ]
}

# 8. HDFC Regalia Gold
REGALIA_GOLD_RULES = [
    {"category_name": "Myntra", "reward_type": "POINTS", "points": 25, "spend_unit": 200},
    {"category_name": "Marks & Spencer", "reward_type": "POINTS", "points": 25, "spend_unit": 200},
    {"category_name": "Reliance Digital", "reward_type": "POINTS", "points": 25, "spend_unit": 200},
    {"category_name": "Nykaa", "reward_type": "POINTS", "points": 25, "spend_unit": 200},
    {"category_name": "Flights", "reward_type": "POINTS", "points": 50, "spend_unit": 200},
    {"category_name": "Hotels", "reward_type": "POINTS", "points": 50, "spend_unit": 200},
    {"category_name": "Utilities", "reward_type": "POINTS", "points": 5, "spend_unit": 200},
    {"category_name": "Insurance", "reward_type": "POINTS", "points": 5, "spend_unit": 200},
    {"category_name": "Education", "reward_type": "POINTS", "points": 5, "spend_unit": 200},
    {"category_name": "All Other Spends", "reward_type": "POINTS", "points": 5, "spend_unit": 200}
]

UPDATES = {
    "Axis Ace Credit Card": {"rules": AXIS_ACE_RULES},
    "SBI Card PRIME": {"rules": SBI_PRIME_RULES},
    "HDFC Millennia Credit Card": {"rules": HDFC_MILLENNIA_RULES},
    "ICICI Emeralde Credit Card": {"rules": ICICI_EMERALDE_RULES},
    "Amex MRCC": {"rules": AMEX_MRCC_RULES, "milestones": AMEX_MRCC_MILESTONES},
    "Kotak Zen Signature": {"rules": KOTAK_ZEN_RULES},
    "Amex Platinum Travel": {"rules": AMEX_PLATINUM_TRAVEL_RULES, "milestones": AMEX_PLATINUM_TRAVEL_MILESTONES},
    "HDFC Regalia Gold": {"rules": REGALIA_GOLD_RULES}
}

async def main():
    async with async_session_factory() as db:
        res = await db.execute(select(CardCatalog))
        cards = res.scalars().all()
        for card in cards:
            if card.card_name in UPDATES:
                upd = UPDATES[card.card_name]
                card.reward_rules_json = {"rules": upd["rules"]}
                if "milestones" in upd:
                    card.milestones_json = upd["milestones"]
                db.add(card)
                print(f"Updated {card.card_name}")
        await db.commit()
        print("Done updating cards with v2 schema!")

if __name__ == "__main__":
    asyncio.run(main())
