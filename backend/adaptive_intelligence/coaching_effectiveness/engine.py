from models.behavioral_profile import UserBehavioralProfile

class CoachingEffectivenessEngine:
    """
    Internal scoring engine to measure if the system is materially helping the user.
    Not a user-facing 'performance score'.
    """
    
    def evaluate_effectiveness(self, profile: UserBehavioralProfile) -> dict:
        """
        Returns an internal assessment of coaching effectiveness based on the user's profile.
        """
        score = profile.overall_coachability_score
        
        # Categorize the effectiveness observationally
        if score > 75:
            assessment = "HIGH_RESPONSIVENESS"
        elif score > 40:
            assessment = "MODERATE_ADOPTION"
        else:
            assessment = "LOW_RESPONSIVENESS"
            
        return {
            "internal_score": score,
            "assessment": assessment,
            "stagnant_count": len(profile.stagnant_categories),
            "improving_count": len(profile.improving_categories)
        }
