from datetime import datetime, timezone
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from insights.schemas import InsightResponse
from models.insight_suppression import InsightSuppression


class CooldownEngine:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def filter_suppressed(
        self, user_id: str, insights: List[InsightResponse]
    ) -> List[InsightResponse]:
        """
        Removes insights that are currently on cooldown or dismissed.
        """
        if not insights:
            return []

        insight_hashes = [i.insight_hash for i in insights]

        # Fetch active suppressions for these hashes
        stmt = select(InsightSuppression).where(
            InsightSuppression.user_id == user_id,
            InsightSuppression.insight_hash.in_(insight_hashes)
        )
        result = await self.db.execute(stmt)
        suppressions = result.scalars().all()

        now = datetime.now(timezone.utc)
        suppressed_hashes = set()

        for supp in suppressions:
            if supp.is_dismissed:
                suppressed_hashes.add(supp.insight_hash)
            elif supp.cooldown_expires_at and supp.cooldown_expires_at > now:
                suppressed_hashes.add(supp.insight_hash)

        return [i for i in insights if i.insight_hash not in suppressed_hashes]

    async def record_shown(self, user_id: str, insight: InsightResponse):
        """
        Record that an insight was shown, setting its cooldown.
        """
        now = datetime.now(timezone.utc)
        # Check if exists
        stmt = select(InsightSuppression).where(
            InsightSuppression.user_id == user_id,
            InsightSuppression.insight_hash == insight.insight_hash
        )
        result = await self.db.execute(stmt)
        suppression = result.scalars().first()

        from datetime import timedelta
        cooldown_delta = timedelta(hours=insight.cooldown_period_hours)

        if suppression:
            suppression.last_shown_at = now
            suppression.cooldown_expires_at = now + cooldown_delta
            suppression.is_dismissed = False
            suppression.suppression_reason = "cooldown"
        else:
            suppression = InsightSuppression(
                user_id=user_id,
                insight_category=insight.category,
                insight_hash=insight.insight_hash,
                last_shown_at=now,
                cooldown_expires_at=now + cooldown_delta,
                is_dismissed=False,
                suppression_reason="cooldown"
            )
            self.db.add(suppression)
        
        await self.db.commit()

    async def record_dismissed(self, user_id: str, insight_hash: str):
        """
        Record explicit user dismissal.
        """
        stmt = select(InsightSuppression).where(
            InsightSuppression.user_id == user_id,
            InsightSuppression.insight_hash == insight_hash
        )
        result = await self.db.execute(stmt)
        suppression = result.scalars().first()

        if suppression:
            suppression.is_dismissed = True
            suppression.suppression_reason = "user_dismissed"
        else:
            now = datetime.now(timezone.utc)
            suppression = InsightSuppression(
                user_id=user_id,
                insight_category="UNKNOWN",
                insight_hash=insight_hash,
                last_shown_at=now,
                is_dismissed=True,
                suppression_reason="user_dismissed"
            )
            self.db.add(suppression)
            
        await self.db.commit()
