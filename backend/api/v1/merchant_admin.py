"""
Module: backend.api.v1.merchant_admin
Responsibility: Admin endpoints for merchant pending review queue and resolution metrics.

Architectural Boundaries:
- Thin routes only — delegates to repositories, no business logic.
- Protected by JWT + admin role check.
- MUST NOT contain direct SQL queries.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db
from auth.dependencies import get_current_user
from merchants.models import PendingReviewStatus
from merchants.pending_review_repository import MetricsRepository, PendingReviewRepository
from merchants.schemas import (
    PendingApprovalRequest,
    PendingMerchantResponse,
    PendingRejectionRequest,
    ResolutionMetricsSummary,
)

router = APIRouter(prefix="/admin/merchants", tags=["merchant-admin"])


def _require_admin(current_user=Depends(get_current_user)):
    """Dependency: require the current user to have admin role."""
    if not getattr(current_user, "is_admin", False) and getattr(current_user, "role", "") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user


# ------------------------------------------------------------------
# Pending Review Queue
# ------------------------------------------------------------------

@router.get("/pending", response_model=list[PendingMerchantResponse])
async def list_pending_merchants(
    status: str = Query(default=PendingReviewStatus.PENDING, description="Filter by status"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    _admin=Depends(_require_admin),
) -> list[PendingMerchantResponse]:
    """List merchants awaiting admin review.

    Returns records in descending creation order.
    Supports pagination via limit/offset.
    """
    repo = PendingReviewRepository(session=db)
    records = await repo.list_pending(status=status, limit=limit, offset=offset)
    return [PendingMerchantResponse.model_validate(r) for r in records]


@router.post("/pending/{review_id}/approve", response_model=PendingMerchantResponse)
async def approve_pending_merchant(
    review_id: UUID,
    request: PendingApprovalRequest,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(_require_admin),
) -> PendingMerchantResponse:
    """Approve a pending merchant and create a canonical merchant record.

    On approval:
    - Creates a canonical Merchant from the LLM-suggested fields.
    - Automatically creates a MerchantAlias from the original raw_input.
    - Marks the pending review as APPROVED.

    The admin can override the display name if the LLM suggestion is incorrect.
    """
    repo = PendingReviewRepository(session=db)
    try:
        review, _merchant = await repo.approve_pending(
            review_id=review_id,
            admin_notes=request.admin_notes,
            display_name_override=request.display_name_override,
        )
        await db.commit()
        return PendingMerchantResponse.model_validate(review)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/pending/{review_id}/reject", response_model=PendingMerchantResponse)
async def reject_pending_merchant(
    review_id: UUID,
    request: PendingRejectionRequest,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(_require_admin),
) -> PendingMerchantResponse:
    """Reject a pending merchant review.

    Marks the record as REJECTED. No merchant is created.
    The raw input that triggered this discovery will continue to resolve as UNKNOWN
    until a canonical merchant is manually added or alias learning occurs.
    """
    repo = PendingReviewRepository(session=db)
    try:
        review = await repo.reject_pending(
            review_id=review_id,
            admin_notes=request.admin_notes,
        )
        await db.commit()
        return PendingMerchantResponse.model_validate(review)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ------------------------------------------------------------------
# Resolution Metrics
# ------------------------------------------------------------------

@router.get("/metrics", response_model=ResolutionMetricsSummary)
async def get_resolution_metrics(
    days: int = Query(default=30, ge=1, le=365, description="Look-back window in days"),
    db: AsyncSession = Depends(get_db),
    _admin=Depends(_require_admin),
) -> ResolutionMetricsSummary:
    """Get merchant resolution metrics for the admin dashboard.

    Returns distribution of resolution types, LLM call rate, and cache hit rate.

    Example response:
        Alias Match:     72%
        Fuzzy Auto:      18%
        LLM Recovery:     7%
        LLM Discovery:    2%
        Unknown:          1%
    """
    metrics_repo = MetricsRepository(session=db)
    summary = await metrics_repo.get_summary(days=days)

    return ResolutionMetricsSummary(
        total_resolutions=summary.get("total_resolutions", 0),
        llm_calls=summary.get("llm_calls", 0),
        llm_call_rate_pct=summary.get("llm_call_rate_pct", 0.0),
        cache_hits=summary.get("cache_hits", 0),
        cache_hit_rate_pct=summary.get("cache_hit_rate_pct", 0.0),
        details={k: v for k, v in summary.items() if k.startswith("type_")},
    )
