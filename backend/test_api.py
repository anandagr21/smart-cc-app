import asyncio
import httpx

async def test():
    async with httpx.AsyncClient() as client:
        # 1. Register a dummy user to get token
        r = await client.post("http://localhost:8000/api/v1/auth/register", json={
            "email": "test@test.com", "password": "password123", "full_name": "Test"
        })
        if r.status_code not in (200, 201):
            # Try login
            r = await client.post("http://localhost:8000/api/v1/auth/login", json={
                "email": "test@test.com", "password": "password123"
            })
        
        token = r.json()["data"]["access_token"]
        
        # 2. Get catalog
        headers = {"Authorization": f"Bearer {token}"}
        r2 = await client.get("http://localhost:8000/api/v1/cards/catalog", headers=headers)
        print("Catalog Status:", r2.status_code)
        print("Catalog Data:", r2.text[:200])

asyncio.run(test())
