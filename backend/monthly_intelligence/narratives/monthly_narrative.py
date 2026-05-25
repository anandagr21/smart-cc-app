from typing import List

from monthly_intelligence.schemas import Narrative, NarrativeType, ConfidenceLevel
from monthly_intelligence.trend_detection.trend_service import TrendSignal


class MonthlyNarrativeGenerator:
    """
    Generates deterministic, editorial narratives based on detected trends.
    Does NOT use AI/LLMs for freeform text generation.
    """

    def generate_narratives(self, trends: List[TrendSignal], metrics: dict) -> List[Narrative]:
        narratives = []
        
        for trend in trends:
            if trend.metric == "optimization_rate":
                if trend.is_improvement:
                    text = f"Your overall optimization rate improved by {trend.delta:.1f}% this month."
                    if trend.confidence == ConfidenceLevel.STRONG_TREND:
                        text = f"You showed a significant improvement this month, optimizing {trend.delta:.1f}% more of your transactions compared to last month."
                    
                    narratives.append(
                        Narrative(
                            id=f"NARRATIVE_OPT_INC_{trend.delta:.1f}",
                            type=NarrativeType.IMPROVEMENT,
                            text=text,
                            confidence=trend.confidence,
                            reasoning=f"Optimization rate increased from {metrics.get('optimization_rate', 0) - trend.delta:.1f}% to {metrics.get('optimization_rate', 0):.1f}%.",
                            novelty_group="OPTIMIZATION_RATE_IMPROVEMENT"
                        )
                    )
                else:
                    text = f"Your overall optimization rate dropped slightly by {abs(trend.delta):.1f}%."
                    narratives.append(
                        Narrative(
                            id=f"NARRATIVE_OPT_DEC_{abs(trend.delta):.1f}",
                            type=NarrativeType.INEFFICIENCY,
                            text=text,
                            confidence=trend.confidence,
                            reasoning=f"Optimization rate decreased by {abs(trend.delta):.1f}% compared to last period.",
                            novelty_group="OPTIMIZATION_RATE_REGRESSION"
                        )
                    )

            elif trend.metric == "missed_opportunity_value":
                if trend.is_improvement:
                    narratives.append(
                        Narrative(
                            id=f"NARRATIVE_MISS_DEC",
                            type=NarrativeType.IMPROVEMENT,
                            text="You missed fewer reward opportunities this month, retaining more value across your spending.",
                            confidence=trend.confidence,
                            reasoning=f"Missed opportunity value decreased by ₹{abs(trend.delta):.2f}.",
                            novelty_group="MISSED_OPPORTUNITY_REDUCTION"
                        )
                    )
                    
        return narratives
