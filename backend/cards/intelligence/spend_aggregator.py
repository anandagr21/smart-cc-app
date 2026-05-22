"""
Module: backend.cards.intelligence.spend_aggregator
Responsibility: Aggregate recalculation layer for user cards.

Recalculates derived state like `current_spend` and `annual_spend` 
dynamically from the actual transaction records rather than blindly mutating.
"""

from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.user_card import UserCard
from transactions.constants import TransactionStatus, TransactionType
from transactions.models import Transaction


class SpendAggregator:
    """Aggregates spend metrics from raw transactions."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def recalculate_card_spend(self, user_card_id: UUID) -> UserCard:
        """
        Recalculate annual_spend and current_spend for a given card by summing
        all valid purchase transactions.
        
        Future enhancement: filter transactions by billing_date and fee_cycle_start_date.
        For MVP, we aggregate all lifetime spend to ensure no data is lost and
        the aggregation matches the current naive single-value fields.
        """
        card = await self._session.get(UserCard, user_card_id)
        if not card:
            raise ValueError(f"UserCard {user_card_id} not found")

        # Sum valid PURCHASE transactions that are PENDING or POSTED
        stmt = (
            select(func.sum(Transaction.amount))
            .where(Transaction.user_card_id == user_card_id)
            .where(Transaction.transaction_type == TransactionType.PURCHASE)
            .where(Transaction.status.in_([TransactionStatus.PENDING, TransactionStatus.POSTED]))
        )
        
        result = await self._session.execute(stmt)
        total_spend = result.scalar_one_or_none() or Decimal("0.00")

        card.current_spend = total_spend
        card.annual_spend = total_spend
        
        self._session.add(card)
        await self._session.commit()
        await self._session.refresh(card)
        
        return card

    async def rebuild_all_card_aggregates(self) -> None:
        """Rebuild spend aggregates for all user cards in the system."""
        stmt = select(UserCard.id)
        result = await self._session.execute(stmt)
        card_ids = result.scalars().all()
        
        for card_id in card_ids:
            await self.recalculate_card_spend(card_id)
