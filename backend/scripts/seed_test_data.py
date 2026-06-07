import asyncio
from uuid import UUID, uuid4
from datetime import datetime, timedelta
import random

from sqlalchemy import select, text
from core.database import async_session_factory
from models.user import User
from transactions.models import Transaction
from transactions.constants import TransactionStatus
from models.transaction_optimization import TransactionOptimizationRecord, AdoptionStatus

async def seed():
    async with async_session_factory() as session:
        # Get user
        result = await session.execute(select(User).where(User.email == "anand@test.com"))
        user = result.scalar_one_or_none()
        if not user:
            print("User anand@test.com not found")
            return

        print(f"Found user {user.id}")
        
        # Clear existing transactions for user to have a clean state
        await session.execute(
            text("DELETE FROM transaction_optimization_records WHERE user_id = :user_id"),
            {"user_id": user.id}
        )
        await session.execute(
            text("DELETE FROM transactions WHERE user_id = :user_id"),
            {"user_id": user.id}
        )
        await session.commit()

        categories = ["Dining", "Groceries", "Travel", "Online Shopping", "Utilities"]
        
        now = datetime.now()
        
        # Create 50 transactions over the last 90 days
        for i in range(50):
            days_ago = random.randint(0, 89)
            txn_date = now - timedelta(days=days_ago)
            
            # Make dining very heavily adopted
            category = random.choice(categories)
            if random.random() < 0.4:
                category = "Dining"
            
            amount = round(random.uniform(10.0, 500.0), 2)
            
            txn = Transaction(
                id=uuid4(),
                user_id=user.id,
                user_card_id=uuid4(),
                merchant_name=f"Test Merchant {i}",
                normalized_merchant=f"merchant_{i}",
                amount=amount,
                category=category,
                transaction_date=txn_date,
                status=TransactionStatus.POSTED
            )
            session.add(txn)
            await session.flush()
            
            # Add optimization records to feed the behavioral engine
            # For Dining, they almost always adopt
            if category == "Dining":
                status = AdoptionStatus.ADOPTED if random.random() < 0.8 else AdoptionStatus.IGNORED
            else:
                status = random.choice([AdoptionStatus.ADOPTED, AdoptionStatus.IGNORED, AdoptionStatus.PENDING])
                
            opt = TransactionOptimizationRecord(
                id=uuid4(),
                transaction_id=txn.id,
                user_id=user.id,
                card_id=uuid4(), # dummy card id
                reward_delta=round(amount * 0.03, 2),
                adoption_status=status
            )
            session.add(opt)
            
        await session.commit()
        print("Seeded 50 transactions and optimizations successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
