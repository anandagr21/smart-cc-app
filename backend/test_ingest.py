import asyncio
import httpx
from core.database import async_session_factory
from models.user import User
from sqlmodel import select
from auth.security import create_access_token

async def test_endpoint():
    async with async_session_factory() as session:
        result = await session.execute(select(User))
        user = result.scalars().first()
        if not user:
            print("No user found")
            return
        token = create_access_token(user.id)
    
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "url": "https://google.com",
        "bank_name": "Google",
        "card_name": "Google Card",
        "source_title": "Test"
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post("http://localhost:8001/api/v1/card-intelligence/ingest-raw", headers=headers, json=payload)
        print("Status code:", resp.status_code)
        print("Response body:", resp.text)

if __name__ == "__main__":
    asyncio.run(test_endpoint())
