from typing import List
from models.behavioral_profile import UserBehavioralProfile
from ..schemas import BehavioralArchetype

class BehavioralPersonalizationEngine:
    """
    Gradually infers optimization preferences based on observed behavior.
    Does NOT hard-lock personalization assumptions. Archetypes remain fluid and soft.
    """
    
    def infer_archetype(self, profile: UserBehavioralProfile) -> BehavioralArchetype:
        """
        Determines the current soft archetype based on the rolling behavioral profile.
        """
        archetypes = []
        
        # Soft inference logic based on profile
        if "DINING" in profile.improving_categories and "TRAVEL" in profile.stagnant_categories:
            archetypes.append("LOCAL_LIFESTYLE")
        
        if len(profile.stagnant_categories) > len(profile.improving_categories) * 2:
            archetypes.append("SIMPLICITY_SEEKER")
            
        if profile.overall_coachability_score > 80:
            archetypes.append("MAXIMIZER")
            
        if not archetypes:
            archetypes = ["BALANCED"]
            
        primary = archetypes[0]
        secondary = archetypes[1:] if len(archetypes) > 1 else []
        
        # Confidence decays if coachability is low, implying we might not understand them well
        confidence = max(0.2, min(1.0, profile.overall_coachability_score / 100))
        
        return BehavioralArchetype(
            primary_archetype=primary,
            secondary_archetypes=secondary,
            confidence_score=confidence
        )
