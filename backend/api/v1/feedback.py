from fastapi import APIRouter, Depends, Request
from sqlmodel.ext.asyncio.session import AsyncSession

from auth.dependencies import get_current_admin_user, get_current_user
from auth.schemas import UserResponse
from core.database import get_db
from core.rate_limit import limiter
from schemas.common import PaginatedResponse
from schemas.feedback import FeedbackCreate, FeedbackResponse
from services.feedback_service import FeedbackService

router = APIRouter()


@router.post("/", response_model=FeedbackResponse, status_code=201)
@limiter.limit("20/hour")
async def submit_feedback(
    request: Request,
    *,
    db: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
    feedback_in: FeedbackCreate,
) -> FeedbackResponse:
    """Submit feedback for inaccurate reward calculations."""
    return await FeedbackService.create_feedback(db, current_user.id, feedback_in)


@router.get("/", response_model=PaginatedResponse[FeedbackResponse])
async def list_feedback(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_admin: UserResponse = Depends(get_current_admin_user),
) -> PaginatedResponse[FeedbackResponse]:
    """List user feedback reports (admin only)."""
    items, total = await FeedbackService.list_feedback(db, skip, limit)
    return PaginatedResponse(
        data=items,
        meta={
            "total": total,
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "page_size": limit,
            "has_next": (skip + limit) < total,
        },
    )
