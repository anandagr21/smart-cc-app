import hashlib
from typing import List

from insights.generators.base import InsightGenerator
from insights.schemas import (
    ConfidenceLevel,
    InsightCategory,
    InsightPriority,
    InsightResponse,
)
from insights.enrichment.transaction_enrichment import EnrichedTransaction
from models.user_card import UserCard


class PortfolioOptimizationGenerator(InsightGenerator):
    def generate(
        self, user_id: str, cards: List[UserCard], transactions: List[EnrichedTransaction]
    ) -> List[InsightResponse]:
        insights = []
        
        # This is a stub for portfolio optimization.
        # A fully built generator would map the user's cards to their primary categories
        # and compare against the user's highest spend categories from transactions.
        
        # Let's do a simple heuristic: if they have high spend in 'travel' but no known travel card
        travel_spend = sum(t.amount for t in transactions if t.category == 'travel')
        
        if travel_spend > 50000:
            # Check if they have a travel card (heuristic: card name contains 'travel', 'miles', 'vistara', etc.)
            has_travel_card = any(
                card.card_catalog and any(w in card.card_catalog.card_name.lower() for w in ['travel', 'miles', 'vistara', 'atlas', 'metal'])
                for card in cards
            )
            
            if not has_travel_card:
                hash_str = f"PORTFOLIO_GAP_TRAVEL_{user_id}"
                insight_hash = hashlib.sha256(hash_str.encode()).hexdigest()
                
                insight = InsightResponse(
                    id="po_travel",
                    category=InsightCategory.PORTFOLIO_OPTIMIZATION,
                    priority=InsightPriority.INFORMATIONAL,
                    confidence=ConfidenceLevel.MODERATE,
                    title="Missing Travel Card",
                    summary="You spend heavily on travel but don't have a dedicated travel rewards card.",
                    reasoning=f"Your travel spend is ₹{travel_spend:,.0f}, which could yield significant airmiles or hotel points with the right card.",
                    badge_label="PORTFOLIO GAP",
                    badge_color="#3B82F6", # Blue
                    actionability_score=40,
                    insight_hash=insight_hash,
                    cooldown_period_hours=24 * 30 # 30 day cooldown
                )
                insights.append(insight)
                
        return insights
