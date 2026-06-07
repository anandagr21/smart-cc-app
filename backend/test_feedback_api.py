import asyncio
import httpx
from core.database import async_session_factory
from models.user import User
from sqlalchemy import select
from auth.security import create_access_token

async def test_feedback():
    async with async_session_factory() as db:
        user = (await db.execute(select(User))).scalars().first()
        if not user:
            print("No User found in DB.")
            return
        user_id = user.id
        from models.card_catalog import CardCatalog
        card = (await db.execute(select(CardCatalog))).scalars().first()
        if not card:
            print("No Card found in DB.")
            return
        card_id = card.id

    token = create_access_token(user_id)
    print(f"Generated Token for user {user_id}")

    async with httpx.AsyncClient(base_url="http://localhost:8001") as client:
        response = await client.post(
            "/api/v1/feedback/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "issue_type": "incorrect_reward",
                "merchant_name": "Amazon",
                "transaction_amount": 10000,
                "card_id": str(card_id),
                "calculated_reward": 500,
                "rule_version": "2026.06.07",
                "calculation_id": "a82bb372-4fd4-4c21-96b5-ba06a9f99ec8",
                "calculation_context": {"foo": "bar"},
                "issue_description": "Reward should be 1000"
            }
        )
        print("Status:", response.status_code)
        if response.status_code != 200:
            print("Response text:", response.text)

if __name__ == "__main__":
    asyncio.run(test_feedback())
