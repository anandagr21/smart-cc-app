from typing import List
from datetime import datetime
from uuid import UUID
from sqlmodel.ext.asyncio.session import AsyncSession

from .schemas import AdaptiveSummaryResponse, AdaptiveInsight
from .adoption_tracking.engine import RecommendationAdoptionEngine
from .behavioral_memory.service import BehavioralMemoryService
from .scoring.confidence_engine import BehavioralConfidenceEngine
from .prioritization.engine import AdaptivePrioritizationEngine
from .suppression.fatigue_engine import RecommendationFatigueEngine
from .personalization.engine import BehavioralPersonalizationEngine
from .narratives.adaptive_generator import AdaptiveNarrativeGenerator
from .coaching_effectiveness.engine import CoachingEffectivenessEngine

class AdaptiveOrchestrator:
    """
    Unified facade for the Adaptive Behavioral Intelligence Layer.
    Augments static metrics with longitudinal behavioral awareness.
    """
    def __init__(self, session: AsyncSession):
        self.session = session
        
        # Instantiate engines
        self.adoption_engine = RecommendationAdoptionEngine(session)
        self.memory_service = BehavioralMemoryService(session, self.adoption_engine)
        self.confidence_engine = BehavioralConfidenceEngine()
        self.prioritization_engine = AdaptivePrioritizationEngine()
        self.fatigue_engine = RecommendationFatigueEngine(session)
        self.personalization_engine = BehavioralPersonalizationEngine()
        self.narrative_generator = AdaptiveNarrativeGenerator()
        self.coaching_engine = CoachingEffectivenessEngine()
        
    async def augment_monthly_summary(
        self, 
        user_id: UUID, 
        raw_metrics: dict,
        recent_transactions: list,
        target_period: str
    ) -> AdaptiveSummaryResponse:
        """
        Takes raw static metrics (e.g. from behavior_analytics) and returns a fully
        adaptive, personalized, and fatigue-checked response.
        """
        # 1. Update/fetch longitudinal profile
        profile = await self.memory_service.calibrate_memory(user_id)
        
        # 2. Get current adoption metrics for the month
        adoption = await self.adoption_engine.track_adoption(user_id)
        
        # 3. Infer soft archetype
        archetype = self.personalization_engine.infer_archetype(profile)
        
        # 4. Generate Narratives
        narratives = []
        # Check confidence of the primary shifting category
        if adoption.categories_improved:
            confidence = self.confidence_engine.calculate_confidence(adoption.categories_improved[0], recent_transactions, True)
            nav = self.narrative_generator.generate_evolution_narrative(profile, adoption, confidence)
            if nav: narratives.append(nav)
        elif adoption.categories_ignored:
            confidence = self.confidence_engine.calculate_confidence(adoption.categories_ignored[0], recent_transactions, False)
            nav = self.narrative_generator.generate_evolution_narrative(profile, adoption, confidence)
            if nav: narratives.append(nav)
            
        # 5. Adaptive Prioritization (Assuming raw_metrics contains some insights, we mock it here if empty)
        # In actual integration, monthly_intelligence will pass raw insights.
        raw_insights = raw_metrics.get("insights", [])
        prioritized_insights = self.prioritization_engine.prioritize(raw_insights, profile)
        
        # 6. Fatigue Suppression
        filtered_insights = await self.fatigue_engine.filter_fatigued_insights(
            user_id=user_id, 
            insights=prioritized_insights,
            material_change=False # To be evaluated based on delta
        )
        
        # Filter out suppressed ones
        active_insights = [i for i in filtered_insights if not i.is_suppressed]
        
        # Record them as shown
        await self.fatigue_engine.record_shown_insights(user_id, active_insights, target_period)
        
        # 7. Internal Coaching Effectiveness (Logged internally, not returned to frontend)
        effectiveness = self.coaching_engine.evaluate_effectiveness(profile)
        # TODO: Send effectiveness to telemetry/internal analytics
        
        return AdaptiveSummaryResponse(
            transaction_count=raw_metrics.get("transaction_count", 0),
            optimization_rate=raw_metrics.get("optimization_rate", 0.0),
            improvement_delta=raw_metrics.get("improvement_delta", 0.0),
            archetype=archetype,
            narratives=narratives,
            insights=active_insights
        )
