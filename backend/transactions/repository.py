"""
Module: backend.transactions.repository
Responsibility: Database access layer for Transactions.

Architectural Boundaries:
- Pure DB operations.
- No HTTP logic, no business rules, no engine calls.
"""

from datetime import date
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, update

from transactions.constants import TransactionStatus
from transactions.exceptions import TransactionNotFoundError
from transactions.models import Transaction


class TransactionRepository:
    """Repository for Transaction entity."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_transaction(self, transaction: Transaction) -> Transaction:
        """Persist a new transaction."""
        self._session.add(transaction)
        await self._session.commit()
        await self._session.refresh(transaction)
        return transaction

    async def get_transaction_by_id(self, transaction_id: UUID) -> Transaction:
        """Fetch a transaction by ID or raise NotFound."""
        transaction = await self._session.get(Transaction, transaction_id)
        if not transaction:
            raise TransactionNotFoundError(transaction_id)
        return transaction

    async def get_transactions_by_user(
        self, user_id: UUID, skip: int = 0, limit: int = 50
    ) -> list[Transaction]:
        """Fetch transactions for a specific user."""
        stmt = (
            select(Transaction)
            .where(Transaction.user_id == user_id)
            .order_by(Transaction.transaction_date.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_transactions_by_card(
        self, user_card_id: UUID, skip: int = 0, limit: int = 50
    ) -> list[Transaction]:
        """Fetch transactions for a specific user card."""
        stmt = (
            select(Transaction)
            .where(Transaction.user_card_id == user_card_id)
            .order_by(Transaction.transaction_date.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def update_transaction_status(
        self, transaction_id: UUID, status: TransactionStatus, posted_date: Optional[date] = None
    ) -> Transaction:
        """Update only the status (and optionally posted_date) to preserve immutability."""
        transaction = await self.get_transaction_by_id(transaction_id)
        
        transaction.status = status
        if posted_date:
            transaction.posted_date = posted_date
            
        self._session.add(transaction)
        await self._session.commit()
        await self._session.refresh(transaction)
        return transaction

    async def update_transaction(self, transaction: Transaction) -> Transaction:
        """Persist updates to an existing transaction."""
        self._session.add(transaction)
        await self._session.commit()
        await self._session.refresh(transaction)
        return transaction
