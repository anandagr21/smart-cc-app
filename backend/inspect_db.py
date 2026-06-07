import asyncio
import json
from core.database import async_session_factory
from models.user import User
from models.card_catalog import CardCatalog
from models.user_card import UserCard
from sqlalchemy import select
from decimal import Decimal

async def inspect():
    async with async_session_factory() as db:
        catalog_cards = (await db.execute(select(CardCatalog))).scalars().all()
        
        print(f"Found {len(catalog_cards)} cards in catalog.")
        
        for catalog_card in catalog_cards:
            print("---")
            print(f"Card Name: {catalog_card.card_name}")
            print(f"Base Point Value: {catalog_card.base_point_value}")
            print(f"Raw Reward Rules JSON:")
            print(json.dumps(catalog_card.reward_rules_json, indent=2))
            
            # Simulate normalization
            raw_rules = catalog_card.reward_rules_json or []
            if isinstance(raw_rules, dict) and "rules" in raw_rules:
                raw_rules = raw_rules["rules"]
                
            print("\nSimulated Normalized Rules:")
            for i, r in enumerate(raw_rules):
                category = str(r.get("category_name", "other"))
                r_type = str(r.get("reward_type", "cashback")).lower()
                multiplier = float(r.get("multiplier", 0.0) or 0.0)
                
                config = {
                    "reward_type": r_type,
                    "reward_rate": multiplier if r_type == "cashback" else 0.0,
                    "points_multiplier": multiplier if r_type != "cashback" else 1.0,
                    "rupee_value": float(catalog_card.base_point_value),
                    "spend_unit": 100,
                    "payment_mode": "any",
                    "cap": float(r.get("cap_limit", 0) or 0) if r.get("has_cap") else 0.0,
                    "scope": "monthly" if r.get("cap_cycle") == "monthly" else "transaction",
                    "excluded_merchants": r.get("merchant_exclusions", []),
                }
                print(f" Rule {i}: {config}")

if __name__ == "__main__":
    asyncio.run(inspect())
