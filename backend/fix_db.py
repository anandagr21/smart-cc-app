import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from core.config import get_settings

async def main():
    settings = get_settings()
    engine = create_async_engine(settings.database_url)
    async with engine.begin() as conn:
        await conn.execute(
            text("ALTER TABLE card_catalogs ADD COLUMN fee_waiver_spend_threshold NUMERIC(12, 2)")
        )
        await conn.execute(
            text("ALTER TABLE user_cards ADD COLUMN fee_cycle_start_date DATE")
        )

from sqlalchemy import text
asyncio.run(main())
