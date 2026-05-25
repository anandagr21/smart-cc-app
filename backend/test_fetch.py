import asyncio
import httpx

async def main():
    async with httpx.AsyncClient(base_url="http://192.168.1.20:8000") as client:
        # Register a test user
        user_data = {
            "email": "test_history@example.com",
            "password": "password123",
            "full_name": "Test User"
        }
        r = await client.post("/api/v1/auth/register", json=user_data)
        if r.status_code == 400: # already exists
            pass
            
        # Login
        r = await client.post("/api/v1/auth/token", data={
            "username": "test_history@example.com",
            "password": "password123"
        })
        token = r.json().get("access_token")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get cards
        r = await client.get("/api/v1/cards", headers=headers)
        cards = r.json()["data"]
        
        if not cards:
            # Add a card
            r_catalog = await client.get("/api/v1/cards/catalog", headers=headers)
            cat_id = r_catalog.json()["data"][0]["id"]
            r_add = await client.post("/api/v1/cards", headers=headers, json={
                "card_catalog_id": cat_id,
                "nickname": "Test Card"
            })
            cards = [r_add.json()["data"]]
            
        card_id = cards[0]["id"]
        
        # Add a transaction
        r_txn = await client.post("/api/v1/transactions", headers=headers, json={
            "user_card_id": card_id,
            "merchant_name": "Test Merchant",
            "amount": 100,
            "transaction_date": "2026-05-22"
        })
        print("CREATE TXN:", r_txn.status_code, r_txn.text)
        
        # Fetch transactions
        r_list = await client.get("/api/v1/transactions", headers=headers)
        print("LIST TXN:", r_list.status_code, r_list.text)

asyncio.run(main())
