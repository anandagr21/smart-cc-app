"""Regression: DELETE /transactions/{id} must not 500 when dependent rows exist.

Every API-created transaction gets a RecommendationBehaviorRecord (and possibly a
TransactionOptimizationRecord), both FK'd to transactions.id with NO ACTION. The
repository must prune those 1:1 dependents before deleting the transaction.
"""
from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal
from typing import AsyncIterator

import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, select
from sqlmodel.ext.asyncio.session import AsyncSession

from behavioral_memory.models import RecommendationBehaviorRecord
from cards.enums import OptimizationPersonality
from models.card_catalog import CardCatalog
from models.transaction_optimization import TransactionOptimizationRecord
from models.user import User
from models.user_card import UserCard
from transactions.models import Transaction
from transactions.repository import TransactionRepository


@pytest_asyncio.fixture(scope="function")
async def session() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,  # one shared connection: PRAGMA + tables visible everywhere
    )
    async with engine.begin() as conn:
        await conn.execute(text("PRAGMA foreign_keys=ON"))  # else the FK bug is invisible
        await conn.run_sync(
            SQLModel.metadata.create_all,
            tables=[
                User.__table__,
                CardCatalog.__table__,
                UserCard.__table__,
                Transaction.__table__,
                RecommendationBehaviorRecord.__table__,
                TransactionOptimizationRecord.__table__,
            ],
        )
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as s:
        yield s
        await s.rollback()
    await engine.dispose()


async def test_delete_transaction_with_dependent_rows(session: AsyncSession) -> None:
    user_id, catalog_id, card_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    session.add(User(id=user_id, email="del@example.com", full_name="Del"))
    session.add(CardCatalog(id=catalog_id, card_name="T", bank_name="B", network="Visa"))
    session.add(UserCard(id=card_id, user_id=user_id, card_catalog_id=catalog_id))
    txn = Transaction(
        user_id=user_id,
        user_card_id=card_id,
        merchant_name="Amazon",
        normalized_merchant="amazon",
        category="shopping",
        amount=Decimal("100.00"),
        transaction_date=date.today(),
    )
    session.add(txn)
    await session.flush()
    session.add(
        RecommendationBehaviorRecord(
            user_id=user_id,
            transaction_id=txn.id,
            selected_card_id=card_id,
            personality_at_time=OptimizationPersonality.BALANCED_INTELLIGENCE,
        )
    )
    session.add(TransactionOptimizationRecord(user_id=user_id, transaction_id=txn.id))
    await session.flush()

    await TransactionRepository(session).delete_transaction(txn)

    assert await session.get(Transaction, txn.id) is None
    assert (
        await session.execute(
            select(RecommendationBehaviorRecord).where(
                RecommendationBehaviorRecord.transaction_id == txn.id
            )
        )
    ).scalar_one_or_none() is None
    assert (
        await session.execute(
            select(TransactionOptimizationRecord).where(
                TransactionOptimizationRecord.transaction_id == txn.id
            )
        )
    ).scalar_one_or_none() is None
