import asyncio
from httpx import AsyncClient

async def main():
    async with AsyncClient(base_url="http://localhost:8000") as client:
        # Login
        r = await client.post("/api/v1/auth/login", json={
            "email": "test_history@example.com",
            "password": "password123"
        })
        token = r.json().get("data", {}).get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get cards
        r_cards = await client.get("/api/v1/cards", headers=headers)
        cards = r_cards.json().get("data", [])
        card_id = cards[0]["id"]
        
        # Add txn 1
        await client.post("/api/v1/transactions", headers=headers, json={
            "user_card_id": card_id,
            "merchant_name": "DOMINOS",
            "amount": 500,
            "transaction_date": "2026-05-22",
            "payment_mode": "offline"
        })
        # Add txn 2
        await client.post("/api/v1/transactions", headers=headers, json={
            "user_card_id": card_id,
            "merchant_name": "FLIPKART",
            "amount": 2000,
            "transaction_date": "2026-05-22",
            "payment_mode": "online"
        })
        
        # Fetch again
        r_list = await client.get("/api/v1/transactions", headers=headers)
        txns = r_list.json().get("data", [])
        for txn in txns:
            print(f"Merchant: {txn.get('merchant_name')} ({txn.get('normalized_merchant')})")
            print(f"Reward: {txn.get('reward_earned')} {txn.get('reward_type')}")
            print("-" * 20)

if __name__ == "__main__":
    asyncio.run(main())
