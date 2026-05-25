"""
Module: backend.transactions.aggregations
Responsibility: Pure SQL aggregation helpers.

Architectural Boundaries:
- Pure aggregations only (totals).
- No reward, milestone, or cap logic.
"""

from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from transactions.constants import TransactionStatus, TransactionType
from transactions.models import Transaction


class TransactionAggregator:
    """Helper for pure database-level aggregations."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_total_spend_by_card(self, user_card_id: UUID) -> Decimal:
        """Calculate total non-reversed spend for a card."""
        return await self._sum_transactions(
            Transaction.user_card_id == user_card_id,
            Transaction.transaction_type == TransactionType.PURCHASE,
            Transaction.status != TransactionStatus.REVERSED,
        )

    async def get_total_spend_by_category(self, user_id: UUID, category: str) -> Decimal:
        """Calculate total spend for a user in a specific category."""
        return await self._sum_transactions(
            Transaction.user_id == user_id,
            Transaction.category == category,
            Transaction.transaction_type == TransactionType.PURCHASE,
            Transaction.status != TransactionStatus.REVERSED,
        )

    async def get_monthly_spend(self, user_card_id: UUID, year: int, month: int) -> Decimal:
        """Calculate total spend for a specific month (based on transaction_date)."""
        # We assume PostgreSQL driver allows extracting year/month using func.extract
        # For simplicity and cross-DB compatibility, we filter by date range.
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)

        return await self._sum_transactions(
            Transaction.user_card_id == user_card_id,
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date < end_date,
            Transaction.transaction_type == TransactionType.PURCHASE,
            Transaction.status != TransactionStatus.REVERSED,
        )

    async def get_annual_spend(self, user_card_id: UUID, year: int) -> Decimal:
        """Calculate total spend for a specific year."""
        start_date = date(year, 1, 1)
        end_date = date(year + 1, 1, 1)

        return await self._sum_transactions(
            Transaction.user_card_id == user_card_id,
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date < end_date,
            Transaction.transaction_type == TransactionType.PURCHASE,
            Transaction.status != TransactionStatus.REVERSED,
        )

    async def _sum_transactions(self, *filters) -> Decimal:
        """Execute a sum query with the given filters."""
        stmt = select(func.sum(Transaction.amount)).where(*filters)
        result = await self._session.execute(stmt)
        total = result.scalar()
        return total if total is not None else Decimal("0.00")
