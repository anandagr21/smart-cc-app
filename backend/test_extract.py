import asyncio
import sys
from uuid import UUID
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
from core.config import get_settings
from services.ai_extraction import extract_single_field

async def main():
    settings = get_settings()
    engine = create_async_engine(settings.database_url)
    async with AsyncSession(engine) as session:
        try:
            # Using the correct document_id
            doc_id = UUID("3c7df426-daf7-4f41-9ed6-d56994531eef")
            result = await extract_single_field(session, doc_id, "renewal_fee")
            print("Success:", result)
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
