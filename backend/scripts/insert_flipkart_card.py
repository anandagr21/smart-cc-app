import asyncio
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from models.card_catalog import CardCatalog
from core.database import async_session_factory
from sqlalchemy import select

async def insert_card():
    async with async_session_factory() as session:
        # Check if card already exists
        stmt = select(CardCatalog).where(CardCatalog.card_name == "Flipkart Axis Bank Credit Card")
        result = await session.execute(stmt)
        existing_card = result.scalars().first()

        if existing_card:
            print("Card already exists in the database.")
            return

        print("Inserting Flipkart Axis Bank Credit Card...")
        
        reward_rules = {
            "default_cashback_percent": 1.5,
            "categories": {
                "ecommerce": {
                    "merchants": ["flipkart", "cleartrip"],
                    "cashback_percent": 5.0
                },
                "preferred_partners": {
                    "merchants": ["swiggy", "pvr", "uber", "tata play", "cult.fit"],
                    "cashback_percent": 4.0
                }
            },
            "exclusions": ["rent", "wallet", "fuel", "emi", "education", "utilities"]
        }

        milestones = {
            "fee_waiver": {
                "spend_threshold": 350000,
                "benefit": "Waives annual fee of ₹500"
            },
            "welcome_benefit": {
                "spend_threshold": 1,
                "days_limit": 30,
                "benefit": "₹1000 worth of welcome vouchers"
            }
        }

        new_card = CardCatalog(
            card_name="Flipkart Axis Bank Credit Card",
            bank_name="Axis Bank",
            normalized_card_key="flipkart_axis",
            network="Visa",
            joining_fee=Decimal("500.00"),
            annual_fee=Decimal("500.00"),
            fee_waiver_spend_threshold=Decimal("350000.00"),
            base_point_value=Decimal("1.00"), # Direct cashback, so 1 point = 1 INR
            reward_rules_json=reward_rules,
            milestones_json=milestones,
            is_approved=True,
            is_active=True
        )

        session.add(new_card)
        await session.commit()
        print("Card successfully inserted!")

if __name__ == "__main__":
    asyncio.run(insert_card())
