from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, func
from fastapi import HTTPException, status
from models.feedback import Feedback
from schemas.feedback import FeedbackCreate

class FeedbackService:
    @staticmethod
    async def create_feedback(db: AsyncSession, user_id: str, feedback_in: FeedbackCreate) -> Feedback:
        duplicate_query = select(Feedback).where(
            Feedback.user_id == user_id,
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
            user_id=user_id
        )
        db.add(feedback)
        await db.commit()
        await db.refresh(feedback)
        return feedback

    @staticmethod
    async def list_feedback(db: AsyncSession, skip: int = 0, limit: int = 50) -> tuple[list[Feedback], int]:
        query = select(Feedback).order_by(Feedback.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(query)
        items = result.scalars().all()
        
        count_query = select(func.count()).select_from(Feedback)
        count_result = await db.execute(count_query)
        total = count_result.scalar_one()
        
        return items, total
