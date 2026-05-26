from typing import List
from datetime import datetime, timedelta
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import select

from models.insight_suppression import InsightSuppression
from ..schemas import AdaptiveInsight

class RecommendationFatigueEngine:
    """
    Prevents the same coaching narrative from becoming repetitive.
    Prioritizes novelty, emotional restraint, and anti-nagging.
    Allows smart resurfacing if material changes occur.
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
        
    async def filter_fatigued_insights(self, user_id, insights: List[AdaptiveInsight], material_change: bool = False) -> List[AdaptiveInsight]:
        """
        Suppresses insights that have been shown too many times recently,
        UNLESS there is a material change (e.g. reward delta increased massively, new card added).
        """
        active_insights = []
        now = datetime.utcnow()
        
        for insight in insights:
            # Query suppression history for this insight hash
            result = await self.session.execute(
                select(InsightSuppression).where(
                    InsightSuppression.user_id == user_id,
                    InsightSuppression.insight_hash == insight.insight_id
                )
            )
            history = result.scalars().all()
            
            # If shown more than 3 times in the last 60 days, suppress
            recent_shows = [h for h in history if h.last_shown_at and (now - h.last_shown_at).days <= 60]
            
            if len(recent_shows) >= 3 and not material_change:
                # Flag as suppressed
                insight.is_suppressed = True
                insight.priority_score = 0
            else:
                insight.is_suppressed = False
                
            active_insights.append(insight)
            
        return active_insights
        
    async def record_shown_insights(self, user_id, insights: List[AdaptiveInsight], period: str):
        for insight in insights:
            if not insight.is_suppressed:
                suppression_record = InsightSuppression(
                    user_id=user_id,
                    insight_category=insight.category,
                    insight_hash=insight.insight_id,
                    period=period,
                    last_shown_at=datetime.utcnow()
                )
                self.session.add(suppression_record)
        await self.session.commit()
