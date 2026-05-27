from uuid import UUID
from typing import Optional
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from behavioral_memory.models import RecommendationBehaviorRecord, OverrideReason
from behavioral_memory.drift_analyzer import PersonalityDriftAnalyzer
from behavioral_memory.confidence import BehavioralConfidenceEngine
from models.optimization_profile import OptimizationPersonalityProfile
from cards.enums import OptimizationPersonality

class BehavioralMemoryEngine:
    """
    Central longitudinal behavioral intelligence system.
    Records transactional decisions, detects overrides, and softly adapts confidence.
    """
    def __init__(self, session: AsyncSession):
        self.session = session
        self.drift_analyzer = PersonalityDriftAnalyzer(session)
        self.confidence_engine = BehavioralConfidenceEngine(session)

    async def record_behavior(
        self,
        user_id: UUID,
        transaction_id: UUID,
        selected_card_id: UUID,
        recommended_card_id: Optional[UUID],
        override_delta_value: Optional[Decimal] = None,
        override_reason: Optional[str] = None
    ) -> None:
        """
        Intercepts transaction creation to log behavioral patterns.
        """
        # Fetch current personality profile
        stmt = select(OptimizationPersonalityProfile).where(
            OptimizationPersonalityProfile.user_id == user_id
        )
        result = await self.session.execute(stmt)
        profile = result.scalar_one_or_none()
        
        personality_at_time = profile.active_personality if profile else OptimizationPersonality.BALANCED_INTELLIGENCE

        was_followed = (
            recommended_card_id is None or 
            selected_card_id == recommended_card_id
        )
        
        parsed_reason = None
        if not was_followed and override_reason:
            try:
                parsed_reason = OverrideReason(override_reason)
            except ValueError:
                parsed_reason = None

        # 1. Create the behavior record
        record = RecommendationBehaviorRecord(
            user_id=user_id,
            transaction_id=transaction_id,
            recommended_card_id=recommended_card_id,
            selected_card_id=selected_card_id,
            personality_at_time=personality_at_time,
            was_followed=was_followed,
            override_delta_value=override_delta_value,
            override_reason=parsed_reason
        )
        self.session.add(record)
        
        # 2. If profile exists, adjust confidence
        if profile:
            is_repeated = False
            if not was_followed:
                is_repeated = await self.drift_analyzer.check_repeated_override_pattern(
                    user_id=user_id,
                    selected_card_id=selected_card_id
                )
            
            # Apply confidence impact
            await self.confidence_engine.apply_confidence_impact(
                profile=profile,
                record=record,
                is_repeated_pattern=is_repeated
            )
            self.session.add(profile)
            
        await self.session.commit()
