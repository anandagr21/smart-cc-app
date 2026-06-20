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
from recommendations.service import RecommendationService
from recommendations.schemas import RecommendationRequest

class MissedRewardsGenerator(InsightGenerator):
    def __init__(self, recommendation_service: RecommendationService):
        self.recommendation_service = recommendation_service

    async def generate_async(
        self, user_id: str, cards: List[UserCard], transactions: List[EnrichedTransaction]
    ) -> List[InsightResponse]:
        insights = []

        if len(cards) < 2 or not transactions:
            return insights

        # Analyze the most recent 10 transactions to find missed rewards
        recent_txns = sorted(transactions, key=lambda t: t.date, reverse=True)[:10]

        # Batch evaluate all recent transactions in a single pass to avoid
        # N× full recommendation pipeline runs (merchant resolution, card fetch,
        # reward engine, ranking, audit logging). Uses pre-normalized data.
        import uuid
        user_uuid = uuid.UUID(user_id)

        eval_requests = [
            RecommendationRequest(
                merchant_name=t.original_merchant_name,
                amount=t.amount,
            )
            for t in recent_txns if t.card_id
        ]

        # Single lightweight batch evaluation — skips audit logging
        # compared to N individual evaluate() calls
        batch_results = await self.recommendation_service.evaluate_batch(
            user_uuid, eval_requests
        ) if eval_requests else []

        for tx, resp in zip(
            [t for t in recent_txns if t.card_id], batch_results
        ):
            if not resp.all_ranked_cards or len(resp.all_ranked_cards) < 2:
                continue

            optimal_card = resp.all_ranked_cards[0]

            # Find the card they actually used in the ranking
            used_card_result = next((c for c in resp.all_ranked_cards if str(c.card_id) == tx.card_id), None)
            
            if not used_card_result:
                continue

            # If the optimal card is not the one they used, and the delta is meaningful
            optimal_value = optimal_card.immediate_reward_value + optimal_card.fee_waiver_progress_impact
            used_value = used_card_result.immediate_reward_value + used_card_result.fee_waiver_progress_impact
            delta = optimal_value - used_value
            
            # Require at least ₹50 delta to warrant an insight
            if str(optimal_card.card_id) != tx.card_id and delta > 50:
                priority = InsightPriority.HIGH if delta > 500 else InsightPriority.MEDIUM
                
                hash_str = f"MISSED_REWARD_{tx.id}_{optimal_card.card_id}"
                insight_hash = hashlib.sha256(hash_str.encode()).hexdigest()
                
                used_card_model = next((c for c in cards if str(c.id) == tx.card_id), None)
                used_name = used_card_model.nickname if used_card_model and used_card_model.nickname else used_card_result.card_name
                
                insight = InsightResponse(
                    id=f"mr_{tx.id}",
                    category=InsightCategory.MISSED_REWARDS,
                    priority=priority,
                    confidence=ConfidenceLevel.HIGH, # Backed by deterministic engine
                    title="Missed Reward Opportunity",
                    summary=f"Using {optimal_card.card_name} for {tx.normalized_merchant_name} could improve returns by ~{((delta / tx.amount) * 100):.1f}%.",
                    reasoning=f"You earned ₹{used_value} with {used_name}, but {optimal_card.card_name} would have earned ₹{optimal_value}.",
                    badge_label="MISSED REWARD",
                    badge_color="#EF4444", # Red
                    related_card_id=str(optimal_card.card_id),
                    monetary_value=delta,
                    source_transactions=[tx.id],
                    actionability_score=80,
                    insight_hash=insight_hash,
                    cooldown_period_hours=24 * 3 # 3 day cooldown
                )
                insights.append(insight)
                
                # We only want to generate the highest delta missed reward for now, to avoid spam
                break
                
        return insights
        
    def generate(
        self, user_id: str, cards: List[UserCard], transactions: List[EnrichedTransaction]
    ) -> List[InsightResponse]:
        # Implementation moved to generate_async since recommendation_service.evaluate is async
        return []
