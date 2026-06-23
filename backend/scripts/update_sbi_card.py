import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from models.card_catalog import CardCatalog
from core.database import async_session_factory
from sqlalchemy import select

async def update_card():
    async with async_session_factory() as session:
        stmt = select(CardCatalog).where(CardCatalog.card_name.ilike("%Cashback SBI%"))
        result = await session.execute(stmt)
        cards = result.scalars().all()

        if not cards:
            print("Card not found!")
            return

        for card in cards:
            print(f"Updating Cashback SBI Card (ID: {card.id})...")
            # Set the JSON according to the new limits
            card.reward_rules_json = {
                "rules": [
                    {
                        "category_name": "Online Spends",
                        "payment_mode": "online",
                        "reward_type": "cashback",
                        "multiplier": 5,
                        "caps": [
                            {
                                "cap_type": "monthly_cap",
                                "limit": 2000.0,
                                "scope": "monthly"
                            }
                        ],
                        "merchant_exclusions": ["utility", "insurance", "fuel", "rent", "wallet", "education", "jewelry", "railway"]
                    },
                    {
                        "category_name": "All Other Spends",
                        "payment_mode": "offline",
                        "reward_type": "cashback",
                        "multiplier": 1,
                        "caps": [
                            {
                                "cap_type": "monthly_cap",
                                "limit": 2000.0,
                                "scope": "monthly"
                            }
                        ],
                        "merchant_exclusions": ["fuel", "rent", "wallet"]
                    }
                ]
            }
            session.add(card)
        
        await session.commit()
        print(f"Successfully updated {len(cards)} cards!")

if __name__ == "__main__":
    asyncio.run(update_card())
