import asyncio
from core.database import async_session_factory
from sqlalchemy import text

async def f():
    async with async_session_factory() as session:
        res = await session.execute(text('select id, card_name, annual_fee, fee_waiver_spend_threshold from card_catalogs'))
        cards = res.all()
        print("--- CATALOG CARDS ---")
        for c in cards:
            print(f"ID={c[0]}, Name={c[1]}, AnnualFee={c[2]}, Threshold={c[3]}")

asyncio.run(f())
