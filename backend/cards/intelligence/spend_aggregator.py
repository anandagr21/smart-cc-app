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
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"UserCard {user_card_id} not found. Skipping spend recalculation.")
            return None

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
        await self._session.flush()
        await self._session.refresh(card)

        return card

    async def rebuild_all_card_aggregates(self) -> None:
        """Rebuild spend aggregates for all user cards in a single batch UPDATE."""
        from sqlalchemy import update as sa_update

        valid_statuses = [TransactionStatus.PENDING, TransactionStatus.POSTED]

        # Single subquery: SUM(amount) per user_card_id
        agg_subq = (
            select(
                Transaction.user_card_id,
                func.coalesce(func.sum(Transaction.amount), Decimal("0.00")).label("total_spend"),
            )
            .where(Transaction.transaction_type == TransactionType.PURCHASE)
            .where(Transaction.status.in_(valid_statuses))
            .group_by(Transaction.user_card_id)
            .subquery()
        )

        # Batch UPDATE from the subquery
        stmt = (
            sa_update(UserCard)
            .values(
                current_spend=agg_subq.c.total_spend,
                annual_spend=agg_subq.c.total_spend,
            )
            .where(UserCard.id == agg_subq.c.user_card_id)
        )

        result = await self._session.execute(stmt)
        await self._session.flush()

        import logging
        logger = logging.getLogger(__name__)
        logger.info("Rebuilt aggregates for %d user cards", result.rowcount)
