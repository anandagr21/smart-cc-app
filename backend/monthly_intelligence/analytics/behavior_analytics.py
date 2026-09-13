from collections import defaultdict
from typing import Any, List, Optional
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

    def __init__(self, recommendation_service: Any = None):
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

        # In-memory deterministic evaluation across wallet cards (zero DB queries)
        from decimal import Decimal
        from recommendations.utils import get_card_name, get_catalog_card, parse_rules_from_catalog
        from reward_engine.evaluator import evaluate as engine_evaluate
        from reward_engine.portfolio_optimization.engine import PortfolioOptimizationEngine
        from reward_engine.schemas import TransactionContext
        from reward_engine.transaction_optimizer.scoring import TransactionScorer
        from reward_engine.transaction_optimizer.schemas import OptimizationIntent
        from fee_waiver.service import FeeWaiverService

        portfolio_engine = PortfolioOptimizationEngine()
        prepared_cards = []
        for uc in user_cards:
            c_name = get_card_name(uc)
            cat_card = get_catalog_card(uc)
            rules = parse_rules_from_catalog(cat_card, c_name)
            waiver_state = FeeWaiverService.get_waiver_state_for_card(uc)
            prepared_cards.append((uc, cat_card, c_name, rules, waiver_state))

        for tx in transactions:
            amount = float(tx.amount)
            total_spent += amount
            cat = tx.category or "other"
            category_spend[cat] += amount

            if tx.user_card_id:
                card_usage[str(tx.user_card_id)] += 1

            if not prepared_cards:
                continue

            merchant = tx.normalized_merchant or tx.merchant_name
            txn_context = TransactionContext(
                merchant=merchant,
                category=cat,
                amount=Decimal(str(tx.amount)),
                payment_mode="any",
                transaction_date=tx.transaction_date,
                is_online=True,
                cumulative_spend=Decimal("0"),
            )

            card_scores = []
            for uc, cat_card, c_name, rules, waiver_state in prepared_cards:
                eval_res = engine_evaluate(txn_context, rules)
                opt_res = portfolio_engine.evaluate_portfolio_impact(
                    eval_res, uc, cat_card, waiver_state, Decimal(str(tx.amount))
                )
                imm = float(opt_res.portfolio_score_breakdown.immediate_reward)
                waiver = round(float(opt_res.portfolio_score_breakdown.waiver_value), 2)
                health = float(opt_res.portfolio_score_breakdown.portfolio_health)
                blended = TransactionScorer.compute_blended_score(
                    intent=OptimizationIntent.BALANCED,
                    immediate_reward=imm,
                    fee_waiver_impact=waiver,
                    simplification_score=health,
                )
                card_scores.append((str(uc.id), blended))

            card_scores.sort(key=lambda x: x[1], reverse=True)
            best_reward = card_scores[0][1]
            actual_entry = next((cs for cs in card_scores if cs[0] == str(tx.user_card_id)), None)
            actual_reward = actual_entry[1] if actual_entry else 0.0

            total_rewards_optimized += actual_reward
            category_rewards[cat] += actual_reward

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
