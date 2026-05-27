from uuid import UUID
from typing import List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, desc

from behavioral_memory.models import RecommendationBehaviorRecord
from cards.enums import OptimizationPersonality

class PersonalityDriftAnalyzer:
    """
    Analyzes rolling windows of transaction behavior to detect strategic drift 
    and identify repeated patterns.
    """
    def __init__(self, session: AsyncSession):
        self.session = session
        self.rolling_window_size = 20  # Look at the last 20 decisions

    async def check_repeated_override_pattern(self, user_id: UUID, selected_card_id: UUID) -> bool:
        """
        Returns True if the user has repeatedly overridden recommendations to select
        this specific card recently (e.g., 3 out of the last 5 overrides).
        """
        stmt = (
            select(RecommendationBehaviorRecord)
            .where(RecommendationBehaviorRecord.user_id == user_id)
            .where(RecommendationBehaviorRecord.was_followed == False)
            .order_by(desc(RecommendationBehaviorRecord.created_at))
            .limit(5)
        )
        result = await self.session.execute(stmt)
        recent_overrides = result.scalars().all()
        
        if len(recent_overrides) < 3:
            return False
            
        matches = sum(1 for r in recent_overrides if r.selected_card_id == selected_card_id)
        return matches >= 3

    async def calculate_strategic_blend(self, user_id: UUID, current_personality: OptimizationPersonality) -> dict:
        """
        Calculates a gradual strategic blending (e.g., TRAVEL_OPTIMIZATION: 62%, MAXIMIZE_REWARDS: 38%)
        based on the last 20 decisions.
        
        Note: A robust implementation would map the selected_card's primary objective to a personality.
        For now, this serves as the foundational skeleton to track follow vs drift ratios.
        """
        stmt = (
            select(RecommendationBehaviorRecord)
            .where(RecommendationBehaviorRecord.user_id == user_id)
            .order_by(desc(RecommendationBehaviorRecord.created_at))
            .limit(self.rolling_window_size)
        )
        result = await self.session.execute(stmt)
        recent_records = result.scalars().all()
        
        if not recent_records:
            return {current_personality.value: 100.0}
            
        follows = sum(1 for r in recent_records if r.was_followed)
        total = len(recent_records)
        
        follow_ratio = follows / total
        
        # Base the primary personality on the follow ratio. 
        # The remainder represents drift (which could be categorized later).
        blend = {
            current_personality.value: round(follow_ratio * 100, 1),
            "DRIFT_UNDETERMINED": round((1 - follow_ratio) * 100, 1)
        }
        
        # Clean up 0% entries
        return {k: v for k, v in blend.items() if v > 0}
