import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from models.card_catalog import CardCatalog
from core.database import async_session_factory
from sqlalchemy import select

async def update_card():
    async with async_session_factory() as session:
        stmt = select(CardCatalog).where(CardCatalog.card_name == "Flipkart Axis Bank Credit Card")
        result = await session.execute(stmt)
        card = result.scalars().first()

        if not card:
            print("Card not found!")
            return

        print("Updating Flipkart Axis Bank Credit Card...")
        
        card.reward_rules_json = {
            "rules": [
                {"rule_type": "merchant_bonus", "merchant": "flipkart", "reward_type": "cashback", "cashback_percent": 5.0},
                {"rule_type": "merchant_bonus", "merchant": "cleartrip", "reward_type": "cashback", "cashback_percent": 5.0},
                {"rule_type": "merchant_bonus", "merchant": "swiggy", "reward_type": "cashback", "cashback_percent": 4.0},
                {"rule_type": "merchant_bonus", "merchant": "pvr", "reward_type": "cashback", "cashback_percent": 4.0},
                {"rule_type": "merchant_bonus", "merchant": "uber", "reward_type": "cashback", "cashback_percent": 4.0},
                {"rule_type": "merchant_bonus", "merchant": "tata play", "reward_type": "cashback", "cashback_percent": 4.0},
                {"rule_type": "merchant_bonus", "merchant": "cult.fit", "reward_type": "cashback", "cashback_percent": 4.0},
                {"rule_type": "base_reward", "reward_type": "cashback", "cashback_percent": 1.5}
            ]
        }
        
        session.add(card)
        await session.commit()
        print("Card successfully updated!")

if __name__ == "__main__":
    asyncio.run(update_card())
