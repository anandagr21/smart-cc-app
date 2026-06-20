from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from models.optimization_profile import OptimizationPersonalityProfile
from cards.enums import OptimizationPersonality

class PersonalityService:
    @staticmethod
    async def get_personality(db: AsyncSession, user_id: str) -> dict:
        stmt = select(OptimizationPersonalityProfile).where(
            OptimizationPersonalityProfile.user_id == user_id
        )
        result = await db.execute(stmt)
        profile = result.scalar_one_or_none()
        
        if not profile:
            profile = OptimizationPersonalityProfile(
                user_id=user_id,
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

    @staticmethod
    async def update_personality(db: AsyncSession, user_id: str, new_personality: OptimizationPersonality) -> dict:
        stmt = select(OptimizationPersonalityProfile).where(
            OptimizationPersonalityProfile.user_id == user_id
        )
        result = await db.execute(stmt)
        profile = result.scalar_one_or_none()
        
        if not profile:
            profile = OptimizationPersonalityProfile(
                user_id=user_id,
                active_personality=new_personality,
                is_inferred=False,
                confidence_score=1.0
            )
            db.add(profile)
        else:
            profile.active_personality = new_personality
            profile.is_inferred = False
            profile.confidence_score = 1.0
            
        await db.commit()
        await db.refresh(profile)
        
        return {
            "active_personality": profile.active_personality,
            "is_inferred": profile.is_inferred,
            "confidence_score": profile.confidence_score
        }
