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
from portfolio_evolution.interpreters import NarrativeOrchestrator
from ai.synthesizer import narrative_synthesizer
from ai import context_builder as cb

class PortfolioEvolutionService:
    @staticmethod
    async def generate_snapshot(user_id: UUID, db: AsyncSession) -> PortfolioEvolutionSnapshot:
        """
        Generates a new portfolio evolution snapshot for the current month.

        Architecture:
          1. Deterministic engines compute all metrics (authoritative)
          2. Deterministic interpreters produce structured narrative observations
          3. AI synthesizer OPTIONALLY generates a synthesized editorial narrative
             using only the semantic context — never raw scores
          4. Snapshot stores both layers for full auditability
          5. AI failure is silent — deterministic narrative is always the fallback
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

        # Compute Metrics (deterministic — never overridden by AI)
        complexity, redundancy, burden = PortfolioHealthEngine.calculate_health_metrics(
            list(cards), list(behaviors)
        )
        
        value_density = PortfolioValueDensityEngine.compute_value_density(list(cards))
        fee_efficiency = min(value_density * 2.0, 10.0)
        alignment = max(10.0 - burden, 0.0)

        # Deterministic narrative orchestration (always runs — AI is additive, not replacement)
        orchestrated = NarrativeOrchestrator.synthesize(
            complexity=complexity,
            redundancy=redundancy,
            density=value_density,
            burden=burden,
            alignment=alignment
        )

        today = date.today()
        snapshot_date = date(today.year, today.month, 1)

        # Upsert logic
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

        # Write deterministic state
        snapshot.complexity_score = complexity
        snapshot.value_density = value_density
        snapshot.redundancy_score = redundancy
        snapshot.fee_efficiency_score = fee_efficiency
        snapshot.strategic_alignment_score = alignment
        snapshot.primary_narrative = orchestrated["primary_narrative"]
        snapshot.topology_insights = orchestrated["topology_insights"]
        snapshot.strategy_reflections = orchestrated["strategy_reflections"]
        snapshot.evolution_observations = orchestrated["evolution_observations"]

        # Flush to get snapshot.id before passing to synthesizer
        await db.flush()

        # AI Narrative Synthesis — additive layer, graceful fallback on any failure
        ai_result = await narrative_synthesizer.synthesize(
            snapshot_id=snapshot.id,
            complexity=complexity,
            redundancy=redundancy,
            density=value_density,
            burden=burden,
            alignment=alignment,
            card_count=len(cards),
            behaviors=list(behaviors),
            existing_context_hash=snapshot.narrative_context_hash,
            fallback_narrative=orchestrated["primary_narrative"],
        )

        if ai_result is not None:
            snapshot.ai_narrative = ai_result.narrative
            snapshot.narrative_context_hash = ai_result.context_hash
            snapshot.narrative_context_json = cb.build_context(
                complexity=complexity, redundancy=redundancy, density=value_density,
                burden=burden, alignment=alignment, card_count=len(cards),
                behaviors=list(behaviors),
            ).model_dump()
            snapshot.narrative_generated_at = ai_result.generated_at
            snapshot.narrative_model = ai_result.model
            snapshot.narrative_prompt_version = ai_result.prompt_version
            snapshot.narrative_generation_reason = ai_result.generation_reason

        await db.commit()
        await db.refresh(snapshot)

        return snapshot
