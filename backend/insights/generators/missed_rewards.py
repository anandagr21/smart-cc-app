import hashlib
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from fee_waiver.service import FeeWaiverService
from insights.enrichment.transaction_enrichment import EnrichedTransaction
from insights.generators.base import InsightGenerator
from insights.schemas import (
    ConfidenceLevel,
    InsightCategory,
    InsightPriority,
    InsightResponse,
)
from models.user_card import UserCard
from recommendations.utils import get_card_name, get_catalog_card, parse_rules_from_catalog
from reward_engine.evaluator import evaluate as engine_evaluate
from reward_engine.portfolio_optimization.engine import PortfolioOptimizationEngine
from reward_engine.schemas import TransactionContext


class MissedRewardsGenerator(InsightGenerator):
    def __init__(self, recommendation_service: Any = None):
        self.recommendation_service = recommendation_service
        self.portfolio_engine = PortfolioOptimizationEngine()

    def generate(
        self, user_id: str, cards: list[UserCard], transactions: list[EnrichedTransaction]
    ) -> list[InsightResponse]:
        insights = []

        if len(cards) < 2 or not transactions:
            return insights

        # Analyze the most recent 10 transactions to find missed rewards
        recent_txns = sorted(transactions, key=lambda t: t.date, reverse=True)[:10]

        # Pre-parse rules and fee waiver states once in-memory for all cards (zero DB queries)
        prepared_cards = []
        for c in cards:
            c_name = get_card_name(c)
            cat_card = get_catalog_card(c)
            rules = parse_rules_from_catalog(cat_card, c_name)
            waiver_state = FeeWaiverService.get_waiver_state_for_card(c)
            prepared_cards.append((c, cat_card, c_name, rules, waiver_state))

        for tx in recent_txns:
            if not tx.card_id:
                continue

            # Parse transaction date safely
            if isinstance(tx.date, str):
                try:
                    txn_date = date.fromisoformat(tx.date.split("T")[0])
                except Exception:
                    txn_date = date.today()
            elif isinstance(tx.date, (date, datetime)):
                txn_date = tx.date if isinstance(tx.date, date) else tx.date.date()
            else:
                txn_date = date.today()

            amount_dec = Decimal(str(tx.amount))

            txn_context = TransactionContext(
                merchant=tx.normalized_merchant_name,
                category=tx.category,
                amount=amount_dec,
                payment_mode="any",
                transaction_date=txn_date,
                is_online=True,
                cumulative_spend=Decimal("0"),
            )

            scored_cards = []
            for user_card, catalog_card, card_name, rules, waiver_state in prepared_cards:
                eval_result = engine_evaluate(txn_context, rules)
                immediate_reward = float(eval_result.effective_reward_inr or Decimal("0"))
                opt_result = self.portfolio_engine.evaluate_portfolio_impact(
                    eval_result, user_card, catalog_card, waiver_state, amount_dec
                )
                waiver_val = opt_result.portfolio_score_breakdown.waiver_value
                total_val = immediate_reward + waiver_val
                scored_cards.append((user_card, card_name, total_val))

            if len(scored_cards) < 2:
                continue

            scored_cards.sort(key=lambda x: x[2], reverse=True)
            optimal_card, optimal_card_name, optimal_val = scored_cards[0]

            used_entry = next((sc for sc in scored_cards if str(sc[0].id) == tx.card_id), None)
            if not used_entry:
                continue

            used_card, used_card_name, used_val = used_entry
            delta = optimal_val - used_val

            # Require at least ₹50 delta and a different card to warrant an insight
            if str(optimal_card.id) != tx.card_id and delta > 50:
                priority = InsightPriority.HIGH if delta > 500 else InsightPriority.MEDIUM

                hash_str = f"MISSED_REWARD_{tx.id}_{optimal_card.id}"
                insight_hash = hashlib.sha256(hash_str.encode()).hexdigest()

                used_name = used_card.nickname if used_card.nickname else used_card_name

                opt_disp = f"{optimal_val:.0f}" if optimal_val == int(optimal_val) else f"{optimal_val:.2f}"
                used_disp = f"{used_val:.0f}" if used_val == int(used_val) else f"{used_val:.2f}"

                insight = InsightResponse(
                    id=f"mr_{tx.id}",
                    category=InsightCategory.MISSED_REWARDS,
                    priority=priority,
                    confidence=ConfidenceLevel.HIGH,  # Backed by deterministic engine
                    title="Missed Reward Opportunity",
                    summary=f"Using {optimal_card_name} for {tx.normalized_merchant_name} could improve returns by ~{((delta / tx.amount) * 100):.1f}%.",
                    reasoning=f"You earned ₹{used_disp} with {used_name}, but {optimal_card_name} would have earned ₹{opt_disp}.",
                    badge_label="MISSED REWARD",
                    badge_color="#EF4444",  # Red
                    related_card_id=str(optimal_card.id),
                    monetary_value=round(delta, 2),
                    source_transactions=[tx.id],
                    actionability_score=80,
                    insight_hash=insight_hash,
                    cooldown_period_hours=24 * 3,  # 3 day cooldown
                )
                insights.append(insight)

                # We only want to generate the highest delta missed reward for now, to avoid spam
                break

        return insights

    async def generate_async(
        self, user_id: str, cards: list[UserCard], transactions: list[EnrichedTransaction]
    ) -> list[InsightResponse]:
        # Pure in-memory evaluation — zero DB queries or async I/O
        return self.generate(user_id, cards, transactions)

