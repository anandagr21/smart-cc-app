import asyncio
import httpx
from core.database import async_session_factory
from models.user import User
from sqlalchemy import select
from auth.security import create_access_token

async def get_token_and_test():
    async with async_session_factory() as db:
        from models.user_card import UserCard
        user_card = (await db.execute(select(UserCard))).scalars().first()
        if not user_card:
            print("No UserCards found in DB.")
            return
        user_id = user_card.user_id

    token = create_access_token(user_id)
    print(f"Generated Token for user {user_id}")

    async with httpx.AsyncClient(base_url="http://localhost:8001") as client:
        response = await client.post(
            "/api/v1/recommendations/evaluate",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "merchant_name": "Amazon",
                "amount": 10000,
                "payment_mode": "online",
                "intent": "MAX_REWARDS"
            }
        )
        print("Status:", response.status_code)
        if response.status_code != 200:
            print("Response text:", response.text)
        
        try:
            data = response.json()
            print("Canonical Merchant:", data.get("normalized_merchant"))
            print("Category:", data.get("category"))
        except Exception:
            data = {}
        print("\nCards:")
        for c in data.get("all_ranked_cards", []):
            print(f"--- {c.get('card_name')} ---")
            print(f"  Immediate Reward: {c.get('immediate_reward_value')}")
            print(f"  Reward Type: {c.get('reward_type')}")
            print(f"  Cashback Amount: {c.get('cashback_amount')}")
            print(f"  Reward Points: {c.get('reward_points')}")

if __name__ == "__main__":
    asyncio.run(get_token_and_test())
