from models.behavioral_profile import UserBehavioralProfile
from ..schemas import AdaptiveInsight

class AdaptivePrioritizationEngine:
    """
    Adjusts prominence of insights based on observed behavioral responsiveness.
    Does NOT create filter bubbles (occasionally allows high-value ignored insights).
    """
    
    def prioritize(self, raw_insights: list, profile: UserBehavioralProfile) -> list:
        """
        Takes raw insights (from static monthly_intelligence) and adjusts their priority score.
        """
        prioritized = []
        
        for raw in raw_insights:
            # We assume raw insight is already mapped to AdaptiveInsight structure
            insight = AdaptiveInsight(**raw.model_dump())
            
            if insight.category in profile.improving_categories:
                # Reinforce positive behavioral shifts
                insight.priority_score *= 1.2
            elif insight.category in profile.stagnant_categories:
                # Deprioritize to prevent repetitive nagging
                # We do not drop to 0. We keep it low so it might occasionally surface if value is massive
                insight.priority_score *= 0.4
                
            prioritized.append(insight)
            
        # Sort by priority
        return sorted(prioritized, key=lambda x: x.priority_score, reverse=True)
