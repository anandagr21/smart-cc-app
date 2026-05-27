from decimal import Decimal
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from behavioral_memory.models import OverrideReason, RecommendationBehaviorRecord
from models.optimization_profile import OptimizationPersonalityProfile

class BehavioralConfidenceEngine:
    """
    Calculates behavioral divergence score based on overrides and adjusts the 
    system's confidence in the user's optimization personality.
    """
    def __init__(self, session: AsyncSession):
        self.session = session

    async def apply_confidence_impact(
        self, 
        profile: OptimizationPersonalityProfile, 
        record: RecommendationBehaviorRecord,
        is_repeated_pattern: bool = False
    ) -> OptimizationPersonalityProfile:
        """
        Updates the profile's confidence_score based on the latest behavior record.
        Returns the updated profile.
        """
        if record.was_followed:
            # Gradually restore confidence for followed recommendations
            profile.confidence_score = min(1.0, profile.confidence_score + 0.02)
            return profile

        # Base impact from magnitude
        delta = float(record.override_delta_value) if record.override_delta_value else 0.0
        
        impact = 0.0
        if delta < 20:
            impact = 0.01  # Tiny impact for minor overrides
        elif delta < 100:
            impact = 0.03  # Moderate impact
        else:
            impact = 0.10  # Strong impact for major overrides

        # Apply modifiers
        if is_repeated_pattern:
            impact += 0.15  # Very strong penalty for repeated patterned overrides

        if record.override_reason:
            if record.override_reason == OverrideReason.TEMPORARY_CHOICE:
                impact = 0.0  # Softened heavily (non-behavioral anomaly)
            elif record.override_reason == OverrideReason.BUILDING_MILESTONE:
                impact *= 0.2  # Softened (strategic override)
            else:
                impact *= 0.5  # Explained overrides are softened

        # Apply the impact
        profile.confidence_score = max(0.0, profile.confidence_score - impact)
        
        # If it drops below 0.3, we consider it heavily degraded
        # (Drift analyzer handles any suggestion/UI flagging)
        
        return profile
