from typing import List
from uuid import UUID

from monthly_intelligence.schemas import Streak
from transactions.models import Transaction


class BehaviorStreakService:
    """
    Detects continuous optimized behavior. 
    Maintains a calm, assistive tone without aggressive gamification.
    """

    def detect_streaks(
        self, user_id: UUID, transactions: List[Transaction], metrics: dict
    ) -> List[Streak]:
        streaks = []
        
        # Simple heuristic: if optimization rate is high and there's a good volume of txns
        opt_rate = metrics.get("optimization_rate", 0)
        tx_count = metrics.get("transaction_count", 0)
        
        if tx_count >= 5 and opt_rate >= 90.0:
            streaks.append(
                Streak(
                    id="HIGH_OPTIMIZATION_STREAK",
                    text=f"Consistent optimization across {tx_count} transactions.",
                    count=tx_count,
                    metric="optimization",
                    reasoning=f"Optimization rate is {opt_rate:.1f}% this period."
                )
            )
            
        return streaks
