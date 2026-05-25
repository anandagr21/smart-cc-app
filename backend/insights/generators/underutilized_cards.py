import hashlib
from datetime import datetime, timezone
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


class UnderutilizedCardGenerator(InsightGenerator):
    def generate(
        self, user_id: str, cards: List[UserCard], transactions: List[EnrichedTransaction]
    ) -> List[InsightResponse]:
        insights = []
        now = datetime.now(timezone.utc)
        
        # Track last usage of each card
        last_used = {}
        for tx in transactions:
            if tx.card_id:
                tx_date = datetime.fromisoformat(tx.date.replace('Z', '+00:00'))
                if tx.card_id not in last_used or tx_date > last_used[tx.card_id]:
                    last_used[tx.card_id] = tx_date

        for card in cards:
            if not card.is_active:
                continue
                
            last_usage_date = last_used.get(str(card.id))
            if last_usage_date:
                # Ensure offset-aware for safe subtraction with now (which is UTC-aware)
                if last_usage_date.tzinfo is None:
                    last_usage_date = last_usage_date.replace(tzinfo=timezone.utc)
                days_inactive = (now - last_usage_date).days
            else:
                days_inactive = 90
            
            # We care most about premium fee-bearing cards going unused
            annual_fee = float(card.card_catalog.annual_fee) if card.card_catalog and card.card_catalog.annual_fee else 0
            
            if days_inactive > 45:
                # If it's a high fee card, it's HIGH priority. Otherwise INFORMATIONAL.
                priority = InsightPriority.INFORMATIONAL
                if annual_fee > 1000 and days_inactive > 60:
                    priority = InsightPriority.HIGH
                elif annual_fee > 0:
                    priority = InsightPriority.MEDIUM
                    
                hash_str = f"UNDERUTILIZED_{card.id}_{days_inactive // 15}" # Hash changes every 15 days
                insight_hash = hashlib.sha256(hash_str.encode()).hexdigest()
                
                card_name = card.nickname or (card.card_catalog.card_name if card.card_catalog else "Your card")
                
                insight = InsightResponse(
                    id=f"uc_{card.id}",
                    category=InsightCategory.UNDERUTILIZED_CARD,
                    priority=priority,
                    confidence=ConfidenceLevel.HIGH if last_usage_date else ConfidenceLevel.ESTIMATED,
                    title="Underutilized Card",
                    summary=f"You haven't used {card_name} in {days_inactive} days.",
                    reasoning=f"This card carries a ₹{annual_fee:,.0f} annual fee, making it important to maximize its rewards or consider cancellation if unused.",
                    badge_label="UNDERUTILIZED",
                    badge_color="#6B7280", # Gray
                    related_card_id=str(card.id),
                    actionability_score=60,
                    insight_hash=insight_hash,
                    cooldown_period_hours=24 * 14 # 14 day cooldown
                )
                insights.append(insight)
                
        return insights
