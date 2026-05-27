from datetime import date
from uuid import UUID
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, desc
from typing import List

from models.user_card import UserCard
from behavioral_memory.models import RecommendationBehaviorRecord
from portfolio_evolution.models import PortfolioEvolutionSnapshot
from portfolio_evolution.health import PortfolioHealthEngine
from portfolio_evolution.value_density import PortfolioValueDensityEngine
from portfolio_evolution.narrative import PortfolioNarrativeEngine

class PortfolioEvolutionService:
    @staticmethod
    async def generate_snapshot(user_id: UUID, db: AsyncSession) -> PortfolioEvolutionSnapshot:
        """
        Generates a new portfolio evolution snapshot for the current month.
        """
        # Fetch active cards
        stmt_cards = select(UserCard).where(
            UserCard.user_id == user_id,
            UserCard.card_status == "ACTIVE"
        )
        result_cards = await db.execute(stmt_cards)
        cards = result_cards.scalars().all()

        # Fetch recent behavior (last 20 for rolling window)
        stmt_behavior = select(RecommendationBehaviorRecord).where(
            RecommendationBehaviorRecord.user_id == user_id
        ).order_by(desc(RecommendationBehaviorRecord.created_at)).limit(20)
        result_behavior = await db.execute(stmt_behavior)
        behaviors = result_behavior.scalars().all()

        # Compute Metrics
        complexity, redundancy, burden = PortfolioHealthEngine.calculate_health_metrics(
            list(cards), list(behaviors)
        )
        
        value_density = PortfolioValueDensityEngine.compute_value_density(list(cards))
        
        # We define fee_efficiency as somewhat tied to value_density here
        fee_efficiency = min(value_density * 2.0, 10.0)
        
        # Strategic alignment is high if burden is low
        alignment = max(10.0 - burden, 0.0)

        # Generate Narrative
        narrative = PortfolioNarrativeEngine.generate_narrative(
            complexity=complexity,
            redundancy=redundancy,
            density=value_density,
            burden=burden
        )

        today = date.today()
        # Current month snapshot date (e.g., 1st of the month)
        snapshot_date = date(today.year, today.month, 1)

        # Upsert logic: if a snapshot for this month exists, update it.
        stmt_existing = select(PortfolioEvolutionSnapshot).where(
            PortfolioEvolutionSnapshot.user_id == user_id,
            PortfolioEvolutionSnapshot.snapshot_date == snapshot_date
        )
        existing_result = await db.execute(stmt_existing)
        snapshot = existing_result.scalar_one_or_none()

        if not snapshot:
            snapshot = PortfolioEvolutionSnapshot(
                user_id=user_id,
                snapshot_date=snapshot_date
            )
            db.add(snapshot)

        snapshot.complexity_score = complexity
        snapshot.value_density = value_density
        snapshot.redundancy_score = redundancy
        snapshot.fee_efficiency_score = fee_efficiency
        snapshot.strategic_alignment_score = alignment
        snapshot.primary_narrative = narrative

        await db.commit()
        await db.refresh(snapshot)

        return snapshot
