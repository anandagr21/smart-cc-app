from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from uuid import UUID

class OptimizationIntent(str, Enum):
    MAX_REWARDS = "MAX_REWARDS"
    SAVE_FEE_WAIVER = "SAVE_FEE_WAIVER"
    BALANCED = "BALANCED"
    SIMPLIFY_DECISIONS = "SIMPLIFY_DECISIONS"

class OptimizerRankedCard(BaseModel):
    card_id: UUID
    card_name: str
    immediate_reward_value: float
    fee_waiver_progress_impact: float
    simplification_score: float
    blended_total_value: float
    explanation: str
    confidence_label: str
    # Keep legacy fields for frontend compatibility for now
    reward_type: str = "CASHBACK"
    cashback_amount: Optional[float] = None
    reward_points: Optional[float] = None
    engine_explanations: List[str] = []

class OptimizationResponse(BaseModel):
    normalized_merchant: Optional[str] = None
    category: Optional[str] = None
    best_cashback_card: Optional[OptimizerRankedCard] = None
    best_fee_waiver_card: Optional[OptimizerRankedCard] = None
    best_balanced_card: Optional[OptimizerRankedCard] = None
    best_simplify_card: Optional[OptimizerRankedCard] = None
    all_ranked_cards: List[OptimizerRankedCard]
