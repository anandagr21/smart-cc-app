from enum import Enum

class RecommendationObjective(str, Enum):
    """
    Core optimization objectives for the longitudinal portfolio engine.
    """
    MAX_REWARD = "MAX_REWARD"
    FEE_WAIVER = "FEE_WAIVER"
    MILESTONE_ACCELERATION = "MILESTONE_ACCELERATION"
    BALANCED = "BALANCED"
    PORTFOLIO_OPTIMIZED = "PORTFOLIO_OPTIMIZED"
