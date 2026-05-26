from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import select

from models.behavioral_profile import UserBehavioralProfile
from ..adoption_tracking.engine import RecommendationAdoptionEngine

class BehavioralMemoryService:
    """
    Slowly calibrates the UserBehavioralProfile over rolling windows (e.g., 90 days).
    Avoids reacting strongly to isolated transactions or short-term fluctuations.
    """
    def __init__(self, session: AsyncSession, adoption_engine: RecommendationAdoptionEngine):
        self.session = session
        self.adoption_engine = adoption_engine
        
    async def get_or_create_profile(self, user_id: UUID) -> UserBehavioralProfile:
        result = await self.session.execute(
            select(UserBehavioralProfile).where(UserBehavioralProfile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()
        
        if not profile:
            profile = UserBehavioralProfile(user_id=user_id)
            self.session.add(profile)
            await self.session.commit()
            await self.session.refresh(profile)
            
        return profile

    async def calibrate_memory(self, user_id: UUID, window_days: int = 90) -> UserBehavioralProfile:
        """
        Updates the longitudinal memory profile. Should be called periodically, not per transaction.
        """
        profile = await self.get_or_create_profile(user_id)
        
        # Calculate start date for rolling window
        start_date = datetime.utcnow() - timedelta(days=window_days)
        
        adoption_metrics = await self.adoption_engine.track_adoption(
            user_id, start_date=start_date
        )
        
        # Soft updates - slowly blend the new metrics into the long-term memory
        # We don't overwrite completely; we evolve it slowly.
        
        # For simplicity in this implementation, we take the 90-day window as the absolute state
        # but in a truly deep system, we'd use exponentially weighted moving averages.
        profile.improving_categories = adoption_metrics.categories_improved
        profile.stagnant_categories = adoption_metrics.categories_ignored
        
        # Update coachability score slowly
        new_coachability = adoption_metrics.adoption_rate
        # Blend (e.g., 70% old, 30% new) to prevent wild swings
        profile.overall_coachability_score = (profile.overall_coachability_score * 0.7) + (new_coachability * 0.3)
        
        profile.last_calibrated_at = datetime.utcnow()
        
        self.session.add(profile)
        await self.session.commit()
        await self.session.refresh(profile)
        
        return profile
