from typing import List, Tuple
from decimal import Decimal
from models.user_card import UserCard
from behavioral_memory.models import RecommendationBehaviorRecord

class PortfolioHealthEngine:
    """
    Analyzes the portfolio to generate structural health metrics.
    Detects complexity, redundancy, optimization burden, and strategic alignment.
    """

    @staticmethod
    def calculate_health_metrics(
        user_cards: List[UserCard], 
        recent_behaviors: List[RecommendationBehaviorRecord]
    ) -> Tuple[float, float, float]:
        """
        Returns:
            complexity_score (0.0 to 10.0)
            redundancy_score (0.0 to 10.0)
            optimization_burden (0.0 to 10.0)
        """
        if not user_cards:
            return 0.0, 0.0, 0.0

        num_cards = len(user_cards)
        
        # 1. Complexity Score
        # More cards = more complexity. Base complexity starts at 1.0 for 1 card.
        # Scales logarithmically-ish. 1 card = 1.0, 3 cards = ~4.0, 6 cards = ~8.0.
        complexity_score = min((num_cards * 1.5), 10.0)
        
        # 2. Redundancy Score
        # Detected by overlapping networks or banks in a simple heuristic,
        # or just having many cards with very low spend.
        redundancy_score = 0.0
        networks = {}
        for c in user_cards:
            if c.card_catalog:
                networks[c.card_catalog.network] = networks.get(c.card_catalog.network, 0) + 1
        
        for net, count in networks.items():
            if count > 1:
                redundancy_score += (count - 1) * 2.0
                
        redundancy_score = min(redundancy_score, 10.0)
        
        # 3. Optimization Burden
        # High override count -> high burden.
        # Too many cards + high override rate = high burden.
        overrides = sum(1 for b in recent_behaviors if not b.was_followed)
        override_rate = (overrides / len(recent_behaviors)) if recent_behaviors else 0.0
        
        burden = (complexity_score * 0.5) + (override_rate * 5.0)
        optimization_burden = min(burden, 10.0)
        
        return complexity_score, redundancy_score, optimization_burden
