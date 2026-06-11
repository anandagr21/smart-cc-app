from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, func
from core.database import get_db
from core.rate_limit import limiter
from auth.dependencies import get_current_user, get_current_admin_user
from auth.schemas import UserResponse
from models.feedback import Feedback
from schemas.feedback import FeedbackCreate, FeedbackResponse
from schemas.common import PaginatedResponse

router = APIRouter()

@router.post("/", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/hour")
async def submit_feedback(
    request: Request,
    *,
    db: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
    feedback_in: FeedbackCreate
) -> Any:
    """
    Submit feedback for inaccurate reward calculations.
    """
    # Check for duplicates (same user, card, merchant, amount, issue_type in 'open' status)
    duplicate_query = select(Feedback).where(
        Feedback.user_id == current_user.id,
        Feedback.card_id == feedback_in.card_id,
        Feedback.merchant_name == feedback_in.merchant_name,
        Feedback.transaction_amount == feedback_in.transaction_amount,
        Feedback.issue_type == feedback_in.issue_type,
        Feedback.status == "open"
    )
    duplicate_result = await db.execute(duplicate_query)
    if duplicate_result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Duplicate feedback report already exists and is open."
        )

    feedback = Feedback(
        **feedback_in.model_dump(),
        user_id=current_user.id
    )
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)
    return feedback

@router.get("/", response_model=PaginatedResponse[FeedbackResponse])
async def list_feedback(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_admin: UserResponse = Depends(get_current_admin_user)
) -> Any:
    """
    List user feedback reports.
    """
    from sqlmodel import select, func
    
    query = select(Feedback).order_by(Feedback.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()
    
    count_query = select(func.count()).select_from(Feedback)
    count_result = await db.execute(count_query)
    total = count_result.scalar_one()
    
    return PaginatedResponse(
        data=items,
        meta={
            "total": total,
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "page_size": limit,
            "has_next": (skip + limit) < total,
        }
    )
