from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from datetime import datetime

class AdoptionMetrics(BaseModel):
    total_recommendations: int
    adopted_count: int
    ignored_count: int
    adoption_rate: float
    categories_improved: List[str]
    categories_ignored: List[str]

class BehavioralArchetype(BaseModel):
    primary_archetype: str
    secondary_archetypes: List[str]
    confidence_score: float

class AdaptiveInsight(BaseModel):
    insight_id: str
    category: str
    text: str
    reasoning_evidence: List[str]
    longitudinal_context: str
    confidence_level: str # e.g. "STRONG_TREND", "EARLY_SIGNAL"
    is_suppressed: bool = False
    priority_score: float = 1.0

class AdaptiveNarrative(BaseModel):
    narrative_id: str
    type: str # e.g., "BEHAVIORAL_EVOLUTION"
    text: str
    reasoning: str
    confidence: str
    evidence: List[str]
    longitudinal_context: str

class AdaptiveSummaryResponse(BaseModel):
    transaction_count: int
    optimization_rate: float
    improvement_delta: float
    archetype: Optional[BehavioralArchetype]
    narratives: List[AdaptiveNarrative]
    insights: List[AdaptiveInsight]
