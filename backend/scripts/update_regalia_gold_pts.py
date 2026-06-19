import asyncio
import os
import sys
from decimal import Decimal
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from sqlalchemy import select
from core.database import async_session_factory
from models.card_catalog import CardCatalog

async def main():
    async with async_session_factory() as db:
        res = await db.execute(select(CardCatalog).where(CardCatalog.card_name == "HDFC Regalia Gold"))
        card = res.scalar_one_or_none()
        if card:
            card.base_point_value = Decimal("0.65")
            db.add(card)
            await db.commit()
            print("Successfully updated HDFC Regalia Gold base_point_value.")
        else:
            print("HDFC Regalia Gold card not found in database.")

asyncio.run(main())
