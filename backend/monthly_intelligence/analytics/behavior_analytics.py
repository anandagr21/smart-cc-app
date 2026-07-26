from collections import defaultdict
from typing import List, Optional
from uuid import UUID

from models.user_card import UserCard
from recommendations.service import RecommendationService
from recommendations.schemas import RecommendationRequest
from transactions.models import Transaction


class BehaviorAnalyticsEngine:
    """
    Computes longitudinal optimization metrics by analyzing historical transactions
    against the deterministic reward engine.
    """

    def __init__(self, recommendation_service: RecommendationService):
        self.recommendation_service = recommendation_service

    async def compute_monthly_metrics(
        self,
        user_id: UUID,
        transactions: List[Transaction],
        user_cards: List[UserCard]
    ) -> dict:
        """
        Dynamically calculates optimization metrics for a given set of transactions.

        Uses a single batch evaluation call instead of N individual evaluate()
        calls, eliminating the N+1 bottleneck for monthly intelligence.
        """
        total_spent = 0.0
        total_rewards_optimized = 0.0
        missed_opportunity_value = 0.0
        optimized_count = 0
        total_count = len(transactions)

        category_spend = defaultdict(float)
        category_rewards = defaultdict(float)
        card_usage = defaultdict(int)

        # Hydrate cards by ID for easy lookup
        card_map = {str(c.id): c for c in user_cards}

        if not transactions:
            return {
                "total_spent": 0.0,
                "total_rewards_optimized": 0.0,
                "missed_opportunity_value": 0.0,
                "optimization_rate": 0.0,
                "strongest_category": None,
                "strongest_card": None,
                "transaction_count": 0,
            }

        # Build batch requests in order — results come back in the same order
        batch_requests = [
            RecommendationRequest(
                amount=float(tx.amount),
                merchant_name=tx.merchant_name,
                transaction_date=tx.transaction_date,
            )
            for tx in transactions
        ]

        # Single batch evaluation instead of N individual calls
        evaluations = await self.recommendation_service.evaluate_batch(user_id, batch_requests)

        # Process results alongside original transactions
        for tx, eval in zip(transactions, evaluations):
            amount = float(tx.amount)
            total_spent += amount
            category_spend[tx.category] += amount

            if tx.user_card_id:
                card_usage[str(tx.user_card_id)] += 1

            if not eval or not eval.all_ranked_cards:
                continue

            best_eval = eval.all_ranked_cards[0]
            actual_eval = next((e for e in eval.all_ranked_cards if str(e.card_id) == str(tx.user_card_id)), None)

            actual_reward = actual_eval.blended_total_value if actual_eval else 0.0
            best_reward = best_eval.blended_total_value

            total_rewards_optimized += actual_reward
            category_rewards[tx.category] += actual_reward

            # If actual reward is close to best reward, it's optimized
            if best_reward - actual_reward < 1.0:
                optimized_count += 1
            else:
                missed_opportunity_value += (best_reward - actual_reward)

        optimization_rate = (optimized_count / total_count * 100) if total_count > 0 else 0.0

        strongest_category = None
        if category_rewards:
            strongest_category = max(category_rewards.items(), key=lambda x: x[1])[0]

        strongest_card_id = None
        if card_usage:
            strongest_card_id = max(card_usage.items(), key=lambda x: x[1])[0]

        strongest_card_name = None
        if strongest_card_id and strongest_card_id in card_map:
            card_obj = card_map[strongest_card_id]
            strongest_card_name = getattr(card_obj, "card_name", "Unknown Card")
            if hasattr(card_obj, "card_catalog") and card_obj.card_catalog:
                strongest_card_name = card_obj.card_catalog.card_name

        return {
            "total_spent": total_spent,
            "total_rewards_optimized": total_rewards_optimized,
            "missed_opportunity_value": missed_opportunity_value,
            "optimization_rate": optimization_rate,
            "strongest_category": strongest_category,
            "strongest_card": strongest_card_name,
            "transaction_count": total_count,
        }
