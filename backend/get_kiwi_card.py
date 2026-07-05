import asyncio
import json
from core.database import async_session_factory
from models.card_catalog import CardCatalog
from sqlalchemy import select
from uuid import UUID

class UUIDEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, UUID):
            return str(obj)
        return json.JSONEncoder.default(self, obj)

async def main():
    async with async_session_factory() as session:
        result = await session.execute(select(CardCatalog).where(CardCatalog.card_name.like("%Yes Bank Kiwi%")))
        card = result.scalar_one_or_none()
        if card:
            d = card.model_dump()
            print(json.dumps(d, cls=UUIDEncoder))
        else:
            print("Card not found in database.")

asyncio.run(main())
