
from insights.schemas import InsightResponse, InsightPriority

class PrioritizationEngine:
    @staticmethod
    def rank_insights(insights: list[InsightResponse]) -> list[InsightResponse]:
        """
        PRIORITY ORDER:
        1. URGENT (e.g. Fee waiver expiring in 2 days)
        2. HIGH (e.g. High reward optimization deltas)
        3. MEDIUM (e.g. Behavioral coaching)
        4. INFORMATIONAL (e.g. Portfolio suggestions)
        """
        
        priority_weights = {
            InsightPriority.URGENT: 4,
            InsightPriority.HIGH: 3,
            InsightPriority.MEDIUM: 2,
            InsightPriority.INFORMATIONAL: 1
        }
        
        return sorted(
            insights,
            key=lambda i: (
                priority_weights.get(i.priority, 0),
                i.actionability_score,
                i.monetary_value or 0
            ),
            reverse=True
        )

    @staticmethod
    def select_primary_insight(insights: list[InsightResponse]) -> InsightResponse | None:
        """
        IMPORTANT PRODUCT RULE: Surface ONLY ONE PRIMARY INSIGHT at a time.
        """
        ranked = PrioritizationEngine.rank_insights(insights)
        return ranked[0] if ranked else None
