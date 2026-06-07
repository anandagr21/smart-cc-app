from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession
from core.database import get_db
from auth.dependencies import get_current_user
from auth.schemas import UserResponse
from models.feedback import Feedback
from schemas.feedback import FeedbackCreate, FeedbackResponse
from schemas.common import PaginatedResponse

router = APIRouter()

@router.post("/", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
    feedback_in: FeedbackCreate
) -> Any:
    """
    Submit feedback for inaccurate reward calculations.
    """
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
    # TODO: Add get_current_admin_user dependency here
    current_user: UserResponse = Depends(get_current_user)
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
