import hashlib
from typing import List, Optional

from insights.generators.base import InsightGenerator
from insights.schemas import (
    ConfidenceLevel,
    InsightCategory,
    InsightPriority,
    InsightResponse,
)
from insights.enrichment.transaction_enrichment import EnrichedTransaction
from models.user_card import UserCard


class FeeWaiverGenerator(InsightGenerator):
    def generate(
        self, user_id: str, cards: List[UserCard], transactions: List[EnrichedTransaction]
    ) -> List[InsightResponse]:
        insights = []

        for card in cards:
            if not card.card_catalog:
                continue
                
            threshold = card.card_catalog.fee_waiver_spend_threshold
            annual_fee = card.card_catalog.annual_fee
            
            # If no threshold or fee, no insight
            if not threshold or not annual_fee or float(annual_fee) == 0:
                continue
                
            threshold_val = float(threshold)
            annual_spend = float(card.annual_spend)
            remaining = threshold_val - annual_spend
            
            if remaining <= 0:
                # Already waived
                continue
                
            progress_percent = (annual_spend / threshold_val) * 100
            
            # We only generate an insight if they are somewhat close or it's a high fee
            if progress_percent < 50:
                continue
                
            priority = InsightPriority.INFORMATIONAL
            if remaining < 15000:
                priority = InsightPriority.HIGH
            if remaining < 5000:
                priority = InsightPriority.URGENT
                
            # Compute a deterministic hash for this insight
            hash_str = f"FEE_WAIVER_{card.id}_{threshold_val}"
            insight_hash = hashlib.sha256(hash_str.encode()).hexdigest()
            
            insight = InsightResponse(
                id=f"fw_{card.id}",
                category=InsightCategory.FEE_WAIVER,
                priority=priority,
                confidence=ConfidenceLevel.HIGH, # We know exactly how much they spent
                title="Near Fee Waiver",
                summary=f"Spend ₹{remaining:,.0f} more on {card.nickname or card.card_catalog.card_name} to waive your ₹{annual_fee:,.0f} annual fee.",
                reasoning=f"Your annual spend is ₹{annual_spend:,.0f} out of the ₹{threshold_val:,.0f} threshold.",
                badge_label="NEAR WAIVER",
                badge_color="#F59E0B", # Amber
                related_card_id=str(card.id),
                monetary_value=float(annual_fee),
                actionability_score=min(100, int((progress_percent))),
                insight_hash=insight_hash,
                cooldown_period_hours=24 * 7 # Suppress for a week after showing
            )
            
            insights.append(insight)
            
        return insights
