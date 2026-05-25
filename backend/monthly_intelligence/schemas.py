from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel

class ConfidenceLevel(str, Enum):
    STRONG_TREND = "STRONG_TREND"
    MODERATE_TREND = "MODERATE_TREND"
    EARLY_SIGNAL = "EARLY_SIGNAL"

class NarrativeType(str, Enum):
    IMPROVEMENT = "IMPROVEMENT"
    INEFFICIENCY = "INEFFICIENCY"
    PORTFOLIO = "PORTFOLIO"
    MILESTONE = "MILESTONE"

class Narrative(BaseModel):
    id: str
    type: NarrativeType
    text: str
    confidence: ConfidenceLevel
    reasoning: str  # Mandatory for explainability
    novelty_group: str

class Forecast(BaseModel):
    id: str
    text: str
    confidence: ConfidenceLevel
    reasoning: str
    target_metric: str

class Streak(BaseModel):
    id: str
    text: str
    count: int
    metric: str
    reasoning: str

class MonthlySummaryResponse(BaseModel):
    period: str  # e.g. "2026-05"
    total_rewards_optimized: float
    missed_opportunity_value: float
    optimization_rate: float
    strongest_category: Optional[str]
    strongest_card: Optional[str]
    improvement_delta: float
    streaks: List[Streak]
    narratives: List[Narrative]
    forecasts: List[Forecast]
    supporting_metrics: Dict[str, Any]
