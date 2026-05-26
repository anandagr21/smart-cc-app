from typing import Dict, List
from pydantic import BaseModel
from reward_engine.schemas import EvaluationResult
from .objectives import RecommendationObjective

class ScoreBreakdown(BaseModel):
    immediate_reward: float
    waiver_value: float
    milestone_value: float
    portfolio_health: float

class OptimizationResult(BaseModel):
    card_id: str
    card_name: str
    evaluation: EvaluationResult
    
    # Engine Outputs
    portfolio_score: float
    portfolio_score_breakdown: ScoreBreakdown
    objective_rankings: Dict[RecommendationObjective, int] = {}
    reason_codes: List[str] = []
    explanation: str = ""
    
    # Structured Insights
    reason_title: str = ""
    reason_description: str = ""
    cashback_value: float = 0.0
    strategic_value: float = 0.0
    total_projected_value: float = 0.0
    confidence_score: float = 0.0
    primary_strategy: str = ""
    supporting_factors: List[str] = []
    recommendation_strength: str = ""
