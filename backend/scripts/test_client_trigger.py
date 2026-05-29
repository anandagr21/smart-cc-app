import sys
import os
import uuid
import asyncio

sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from fastapi.testclient import TestClient
from main import app
from auth.dependencies import get_current_user
from models.user import User
from core.database import async_session_factory
from card_intelligence.models import CardKnowledgeSource
from sqlalchemy import select

async def get_latest_source():
    async with async_session_factory() as db:
        result = await db.execute(select(CardKnowledgeSource).order_by(CardKnowledgeSource.uploaded_at.desc()))
        return result.scalars().first()

def run_test():
    source = asyncio.run(get_latest_source())
    if not source:
        print("No source found")
        return
        
    print(f"Testing pipeline for source: {source.id} ({source.source_url or source.storage_path})")

    # Override auth to return a dummy user
    dummy_user = User(id=uuid.uuid4(), email="test@example.com")
    app.dependency_overrides[get_current_user] = lambda: dummy_user

    client = TestClient(app)
    
    response = client.post(f"/api/v1/card-intelligence/sources/{source.id}/process")
    print("Status Code:", response.status_code)
    print("Response:", response.json())

if __name__ == "__main__":
    run_test()
