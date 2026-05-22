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
        if not cards:
            r_catalog = await client.get("/api/v1/cards/catalog", headers=headers)
            cat_id = [c["id"] for c in r_catalog.json().get("data", []) if "Cashback SBI" in c["card_name"]][0]
            r_add = await client.post("/api/v1/cards", headers=headers, json={
                "card_catalog_id": cat_id,
                "nickname": "My SBI"
            })
            cards = [r_add.json()["data"]]
            
        card_id = cards[0]["id"]
        
        # Add txn
        await client.post("/api/v1/transactions", headers=headers, json={
            "user_card_id": card_id,
            "merchant_name": "AMAZON IN",
            "amount": 1000,
            "transaction_date": "2026-05-22",
            "payment_mode": "online"
        })
        
        # Fetch again
        r_list = await client.get("/api/v1/transactions", headers=headers)
        txns = r_list.json().get("data", [])
        for txn in txns:
            print(f"Merchant: {txn.get('merchant_name')}")
            print(f"Norm Merchant: {txn.get('normalized_merchant')}")
            print(f"Category: {txn.get('category')}")
            print(f"Reward: {txn.get('reward_earned')} {txn.get('reward_type')}")
            print(f"Best Card: {txn.get('best_possible_card')}")
            print(f"Missed: {txn.get('missed_savings')}")
            print("-" * 20)

if __name__ == "__main__":
    asyncio.run(main())
