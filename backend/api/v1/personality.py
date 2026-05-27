from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from pydantic import BaseModel
import uuid

from auth.dependencies import get_current_user
from api.deps import get_db
from models.user import User
from models.optimization_profile import OptimizationPersonalityProfile
from cards.enums import OptimizationPersonality

router = APIRouter(prefix="/personality", tags=["personality"])

class PersonalityUpdateRequest(BaseModel):
    personality: OptimizationPersonality

@router.get("/")
async def get_personality(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    stmt = select(OptimizationPersonalityProfile).where(
        OptimizationPersonalityProfile.user_id == user.id
    )
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()
    
    if not profile:
        # Create a default profile if none exists
        profile = OptimizationPersonalityProfile(
            user_id=user.id,
            active_personality=OptimizationPersonality.BALANCED_INTELLIGENCE,
            is_inferred=False,
            confidence_score=1.0
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
        
    return {
        "active_personality": profile.active_personality,
        "is_inferred": profile.is_inferred,
        "confidence_score": profile.confidence_score
    }

@router.put("/")
async def update_personality(
    request: PersonalityUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    stmt = select(OptimizationPersonalityProfile).where(
        OptimizationPersonalityProfile.user_id == user.id
    )
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()
    
    if not profile:
        profile = OptimizationPersonalityProfile(
            user_id=user.id,
            active_personality=request.personality,
            is_inferred=False,
            confidence_score=1.0
        )
        db.add(profile)
    else:
        profile.active_personality = request.personality
        profile.is_inferred = False
        profile.confidence_score = 1.0
        
    await db.commit()
    await db.refresh(profile)
    
    return {
        "active_personality": profile.active_personality,
        "is_inferred": profile.is_inferred,
        "confidence_score": profile.confidence_score
    }
