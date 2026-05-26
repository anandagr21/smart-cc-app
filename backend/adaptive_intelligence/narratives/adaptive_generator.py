import uuid
from typing import List, Optional
import random

from models.behavioral_profile import UserBehavioralProfile
from .tone_dictionary import ToneDictionary
from ..schemas import AdaptiveNarrative, AdoptionMetrics

class AdaptiveNarrativeGenerator:
    """
    Generates behavior-aware longitudinal narratives using deterministic templates.
    No freeform AI generation. Guaranteed tone safety.
    """
    
    def generate_evolution_narrative(
        self, 
        profile: UserBehavioralProfile, 
        adoption: AdoptionMetrics,
        confidence: str
    ) -> Optional[AdaptiveNarrative]:
        """
        Creates a high-level behavioral evolution narrative for the month.
        """
        if not adoption.categories_improved and not adoption.categories_ignored:
            return None
            
        evidence = [
            f"Based on {adoption.total_recommendations} tracked optimization opportunities.",
            f"Observed {adoption.adoption_rate:.1f}% overall adoption rate this period."
        ]
        
        # Pick category to highlight
        if adoption.categories_improved:
            cat = adoption.categories_improved[0]
            phrase = ToneDictionary.APPROVED_IMPROVEMENT_PHRASES[0]
            text = f"{cat} optimization {phrase}."
            reasoning = f"You consistently adopted higher-yield payment methods for {cat} transactions."
            evidence.append(f"Strong adoption in {cat} category.")
            longitudinal = "This reinforces a positive shift in your behavioral profile."
        else:
            cat = adoption.categories_ignored[0]
            phrase = ToneDictionary.APPROVED_STAGNANT_PHRASES[0]
            text = f"{cat} optimization {phrase}."
            reasoning = f"Alternative payment methods offering higher yields were frequently available for {cat} transactions."
            evidence.append(f"Recurring optimization gaps observed in {cat}.")
            longitudinal = "This category remains a persistent area of friction in your profile."
            
        # Tone Validation (Safety Check)
        if not ToneDictionary.validate_narrative(text) or not ToneDictionary.validate_narrative(reasoning):
            # Fallback to absolute generic if tone validation fails (should never happen with these templates)
            text = "Optimization patterns recorded."
            reasoning = "Behavioral data collected."
            
        return AdaptiveNarrative(
            narrative_id=str(uuid.uuid4()),
            type="BEHAVIORAL_EVOLUTION",
            text=text,
            reasoning=reasoning,
            confidence=confidence,
            evidence=evidence,
            longitudinal_context=longitudinal
        )
