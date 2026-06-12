"""
Module: backend.merchants.pending_review_repository
Responsibility: Data access for merchant pending review queue.

Architectural Boundaries:
- Database queries only — no business logic, no LLM calls.
- Admin approval automatically creates canonical merchant + alias.
- No HTTP logic.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Sequence
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from merchants.models import (
    Merchant,
    MerchantAlias,
    MerchantPendingReview,
    MerchantResolutionMetric,
    PendingReviewStatus,
    MerchantType,
)
from merchants.normalizer import normalize, normalize_with_tokens
from merchants.llm_resolver import LLMDiscoveryResult

logger = logging.getLogger(__name__)


class PendingReviewRepository:
    """Repository for the merchant pending review queue.

    Handles creation of pending review records (from LLM Discovery),
    admin approval (which creates a canonical merchant + auto-alias),
    and rejection.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_pending(
        self,
        raw_input: str,
        llm_result: LLMDiscoveryResult,
    ) -> MerchantPendingReview:
        """Create a pending review record from an LLM Discovery result.

        Args:
            raw_input: Original normalized user input that triggered discovery.
            llm_result: Structured output from the LLM Discovery stage.

        Returns:
            Created MerchantPendingReview record.
        """
        record = MerchantPendingReview(
            raw_input=raw_input,
            suggested_name=llm_result.merchant_name,
            category=llm_result.category,
            subcategory=llm_result.subcategory,
            merchant_type=llm_result.merchant_type,
            mcc_hint=llm_result.mcc_hint,
            is_known_brand=llm_result.is_known_brand,
            confidence=llm_result.confidence,
            status=PendingReviewStatus.PENDING,
        )
        self.session.add(record)
        await self.session.flush()
        await self.session.refresh(record)
        logger.info(
            "Pending review created: raw_input=%r → suggested=%r (conf=%.2f)",
            raw_input, llm_result.merchant_name, llm_result.confidence
        )
        return record

    async def list_pending(
        self,
        status: str = PendingReviewStatus.PENDING,
        limit: int = 50,
        offset: int = 0,
    ) -> Sequence[MerchantPendingReview]:
        """List pending review records filtered by status."""
        query = (
            select(MerchantPendingReview)
            .where(MerchantPendingReview.status == status)
            .order_by(MerchantPendingReview.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(query)
        return result.scalars().all()

    async def get_by_id(self, review_id: UUID) -> MerchantPendingReview | None:
        """Fetch a single pending review by ID."""
        result = await self.session.execute(
            select(MerchantPendingReview).where(MerchantPendingReview.id == review_id)
        )
        return result.scalar_one_or_none()

    async def approve_pending(
        self,
        review_id: UUID,
        admin_notes: str | None = None,
        display_name_override: str | None = None,
    ) -> tuple[MerchantPendingReview, Merchant]:
        """Approve a pending review and create a canonical merchant.

        On approval:
        1. Creates canonical Merchant from suggested fields.
        2. Auto-creates MerchantAlias from the original raw_input (modification #5).
        3. Marks the review as APPROVED with timestamp.

        Args:
            review_id: UUID of the pending review to approve.
            admin_notes: Optional admin comments.
            display_name_override: Override the LLM-suggested name if needed.

        Returns:
            Tuple of (updated review, created merchant).

        Raises:
            ValueError: If review not found or already processed.
        """
        review = await self.get_by_id(review_id)
        if review is None:
            raise ValueError(f"Pending review {review_id} not found.")
        if review.status != PendingReviewStatus.PENDING:
            raise ValueError(f"Review {review_id} is already {review.status}.")

        # Determine canonical and display names
        canonical_name, tokens = normalize_with_tokens(review.suggested_name)
        display_name = display_name_override or review.suggested_name

        # 1. Create canonical merchant
        merchant = Merchant(
            canonical_name=canonical_name,
            display_name=display_name,
            category=review.category,
            merchant_type=review.merchant_type,
            mcc_hint=review.mcc_hint,
            normalized_tokens=tokens,
        )
        self.session.add(merchant)
        await self.session.flush()
        await self.session.refresh(merchant)

        # 2. Auto-create alias from original raw_input
        normalized_alias = normalize(review.raw_input)
        alias = MerchantAlias(
            merchant_id=merchant.id,
            raw_name=review.raw_input,
            normalized_name=normalized_alias,
            normalized_tokens=normalized_alias.split(),
            source="LLM",
            confidence=review.confidence,
        )
        self.session.add(alias)

        # 3. Mark review as approved
        review.status = PendingReviewStatus.APPROVED
        review.admin_notes = admin_notes
        review.approved_merchant_id = merchant.id
        review.reviewed_at = datetime.utcnow()
        self.session.add(review)

        await self.session.flush()
        logger.info(
            "Pending review %s APPROVED → merchant_id=%s, canonical=%r, alias=%r",
            review_id, merchant.id, canonical_name, normalized_alias
        )
        return review, merchant

    async def reject_pending(
        self,
        review_id: UUID,
        admin_notes: str | None = None,
    ) -> MerchantPendingReview:
        """Reject a pending review record.

        Args:
            review_id: UUID of the pending review to reject.
            admin_notes: Optional admin comments.

        Returns:
            Updated review with REJECTED status.
        """
        review = await self.get_by_id(review_id)
        if review is None:
            raise ValueError(f"Pending review {review_id} not found.")
        if review.status != PendingReviewStatus.PENDING:
            raise ValueError(f"Review {review_id} is already {review.status}.")

        review.status = PendingReviewStatus.REJECTED
        review.admin_notes = admin_notes
        review.reviewed_at = datetime.utcnow()
        self.session.add(review)
        await self.session.flush()
        logger.info("Pending review %s REJECTED.", review_id)
        return review

    async def count_by_status(self) -> dict[str, int]:
        """Return count of pending reviews grouped by status."""
        result = await self.session.execute(
            select(MerchantPendingReview.status, func.count())
            .group_by(MerchantPendingReview.status)
        )
        return {row[0]: row[1] for row in result.all()}


class MetricsRepository:
    """Repository for merchant resolution telemetry."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def record(
        self,
        raw_input: str,
        normalized_input: str,
        resolution_type: str,
        confidence: float,
        fuzzy_score: float | None = None,
        llm_called: bool = False,
        cache_hit: bool = False,
        merchant_id: UUID | None = None,
    ) -> None:
        """Insert a telemetry record for a resolution attempt."""
        metric = MerchantResolutionMetric(
            raw_input=raw_input,
            normalized_input=normalized_input,
            resolution_type=resolution_type,
            confidence=confidence,
            fuzzy_score=fuzzy_score,
            llm_called=llm_called,
            cache_hit=cache_hit,
            merchant_id=merchant_id,
        )
        self.session.add(metric)
        # Fire-and-forget: don't block on flush, caller commits session
        try:
            await self.session.flush()
        except Exception as e:
            logger.warning("Failed to flush metrics record: %s", e)

    async def get_summary(self, days: int = 30) -> dict[str, int | float]:
        """Return aggregated resolution metrics for the last N days."""
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(days=days)

        # Count by resolution type
        result = await self.session.execute(
            select(
                MerchantResolutionMetric.resolution_type,
                func.count().label("count"),
            )
            .where(MerchantResolutionMetric.resolved_at >= cutoff)
            .group_by(MerchantResolutionMetric.resolution_type)
        )
        type_counts = {row[0]: row[1] for row in result.all()}

        total = sum(type_counts.values()) or 1
        # LLM call count
        llm_result = await self.session.execute(
            select(func.count())
            .where(MerchantResolutionMetric.resolved_at >= cutoff)
            .where(MerchantResolutionMetric.llm_called == True)
        )
        llm_count = llm_result.scalar_one()

        # Cache hit count
        cache_result = await self.session.execute(
            select(func.count())
            .where(MerchantResolutionMetric.resolved_at >= cutoff)
            .where(MerchantResolutionMetric.cache_hit == True)
        )
        cache_count = cache_result.scalar_one()

        return {
            "total_resolutions": total,
            "llm_calls": llm_count,
            "llm_call_rate_pct": round(llm_count / total * 100, 1),
            "cache_hits": cache_count,
            "cache_hit_rate_pct": round(cache_count / total * 100, 1),
            **{f"type_{k.lower()}": v for k, v in type_counts.items()},
            **{f"type_{k.lower()}_pct": round(v / total * 100, 1) for k, v in type_counts.items()},
        }
