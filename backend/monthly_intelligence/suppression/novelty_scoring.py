from datetime import datetime, timezone
from typing import List
from uuid import UUID

from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import select

from models.insight_suppression import InsightSuppression
from monthly_intelligence.schemas import Narrative


class NoveltyScoringEngine:
    """
    Prevents narrative fatigue by suppressing narratives from the same novelty_group
    that have been shown recently for the same period.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def filter_narratives(self, user_id: UUID, narratives: List[Narrative], period: str) -> List[Narrative]:
        if not narratives:
            return []

        # Fetch all suppressions for this user in this scope
        stmt = select(InsightSuppression).where(
            InsightSuppression.user_id == user_id,
            InsightSuppression.scope == "MONTHLY"
        )
        result = await self.db.execute(stmt)
        suppressions = result.scalars().all()
        
        # We want to avoid showing a narrative if a narrative with the same novelty_group
        # has already been shown for THIS period.
        # Alternatively, if they saw it last period, we might still show it if it's a continuing trend,
        # but for V1 we just make sure we don't spam the same novelty_group multiple times a month.
        
        suppressed_groups_for_period = {
            s.novelty_group for s in suppressions 
            if s.period == period and s.novelty_group
        }
        
        filtered = []
        for n in narratives:
            if n.novelty_group not in suppressed_groups_for_period:
                filtered.append(n)
                
        return filtered

    async def mark_narratives_shown(self, user_id: UUID, narratives: List[Narrative], period: str):
        now = datetime.utcnow()
        
        for n in narratives:
            if not n.novelty_group:
                continue
                
            # Check if exists
            stmt = select(InsightSuppression).where(
                InsightSuppression.user_id == user_id,
                InsightSuppression.scope == "MONTHLY",
                InsightSuppression.novelty_group == n.novelty_group,
                InsightSuppression.period == period
            )
            result = await self.db.execute(stmt)
            supp = result.scalars().first()
            
            if supp:
                supp.last_shown_at = now
            else:
                supp = InsightSuppression(
                    user_id=user_id,
                    insight_category="MONTHLY_NARRATIVE",
                    insight_hash=f"{n.novelty_group}_{period}",
                    scope="MONTHLY",
                    novelty_group=n.novelty_group,
                    period=period,
                    last_shown_at=now
                )
                self.db.add(supp)
                
        await self.db.commit()
