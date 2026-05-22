"""
Module: backend.transactions.enrichment
Responsibility: Lightweight orchestration layer to compute reward insights on-read.

Architectural Boundaries:
- Wraps the pure reward engine for bulk evaluation.
- Preserves engine purity (no DB calls inside the loop).
- Fetches required DB state once per batch to avoid N+1 queries.
"""

from typing import Any
from uuid import UUID

from recommendations.explainers import aggregate_explanations
from reward_engine.evaluator import evaluate as engine_evaluate
from reward_engine.ranking import rank_cards
from reward_engine.ranking_schemas import CardEvaluationInput, RankingResult
from reward_engine.schemas import NormalizedRuleConfig, TransactionContext
from rewards.service import RewardRuleService
from services.card_service import UserCardService
from transactions.schemas import EnrichedTransactionResponse, TransactionResponse


class TransactionEnrichmentService:
    """Orchestrates bulk enrichment of transactions with reward insights."""

    def __init__(
        self,
        user_card_service: UserCardService,
        reward_rule_service: RewardRuleService,
    ) -> None:
        self._user_card_service = user_card_service
        self._reward_rule_service = reward_rule_service

    async def enrich_transactions(
        self, user_id: UUID, transactions: list[TransactionResponse]
    ) -> list[EnrichedTransactionResponse]:
        """Enrich a batch of transactions with on-the-fly reward evaluation."""
        if not transactions:
            return []

        # 1. Fetch user cards ONCE
        user_cards, _ = await self._user_card_service.get_user_cards(user_id, skip=0, limit=100)
        if not user_cards:
            # If no cards, just return unenriched payload mapped to Enriched type
            return [EnrichedTransactionResponse.model_validate(t) for t in transactions]

        # 2. Fetch all active rules ONCE and map them
        rules_by_card_id: dict[str, list[NormalizedRuleConfig]] = {}
        for uc in user_cards:
            card_id_str = str(uc.card_catalog_id)
            if card_id_str not in rules_by_card_id:
                raw_rules = await self._reward_rule_service.get_card_active_rules(card_id_str)
                rules_by_card_id[card_id_str] = [
                    NormalizedRuleConfig(
                        rule_name=r.rule_name,
                        rule_type=r.rule_type,
                        priority=r.priority,
                        config=r.rule_config,
                    )
                    for r in raw_rules
                ]

        enriched_results: list[EnrichedTransactionResponse] = []

        # 3. Bulk evaluate in memory (extremely fast pure Python loop)
        for txn in transactions:
            txn_context = TransactionContext(
                merchant=txn.normalized_merchant,
                category=txn.category,
                amount=txn.amount,
                payment_mode=txn.payment_mode.value if hasattr(txn.payment_mode, "value") else str(txn.payment_mode),
                transaction_date=txn.transaction_date or txn.created_at.date(),
                is_online=txn.payment_mode in ["online", "contactless"],
                mcc_code=None,
                cumulative_spend=0,
            )

            eval_inputs: list[CardEvaluationInput] = []
            used_card_nickname = "Unknown Card"

            for uc in user_cards:
                card_id_str = str(uc.card_catalog_id)
                card_name = uc.nickname or (uc.card_details.card_name if getattr(uc, "card_details", None) else "Unknown")
                
                if str(uc.id) == str(txn.user_card_id):
                    used_card_nickname = card_name

                rules = rules_by_card_id.get(card_id_str, [])
                eval_result = engine_evaluate(txn_context, rules)

                eval_inputs.append(
                    CardEvaluationInput(
                        card_id=str(uc.id),  # Use user_card_id for tracking in ranker
                        card_name=card_name,
                        evaluation=eval_result,
                        annual_fee=0,
                    )
                )

            # 4. Rank results to find best card
            ranking_result: RankingResult = rank_cards(eval_inputs)

            # 5. Extract insights for the used card
            used_card_result = next((r for r in ranking_result.ranked if r.card_id == str(txn.user_card_id)), None)
            best_card_result = ranking_result.ranked[0] if ranking_result.ranked else None

            reward_earned = None
            reward_type = None
            recommendation_reason = None
            warnings = []

            if used_card_result:
                reward_earned = used_card_result.effective_reward_inr
                reward_type = used_card_result.reward_type.value if hasattr(used_card_result.reward_type, "value") else str(used_card_result.reward_type)
                recommendation_reason = used_card_result.recommendation_reason
                warnings = used_card_result.warnings

            missed_savings = None
            best_possible_card = None

            if best_card_result and used_card_result:
                delta = best_card_result.effective_reward_inr - used_card_result.effective_reward_inr
                # Only show missed savings if it's meaningful (e.g. > 0)
                if delta > 0:
                    missed_savings = delta
                    best_possible_card = best_card_result.card_name

            # 6. Map to enriched schema
            enriched_dict = txn.model_dump()
            enriched = EnrichedTransactionResponse(
                **enriched_dict,
                reward_earned=reward_earned,
                reward_type=reward_type,
                best_possible_card=best_possible_card,
                missed_savings=missed_savings,
                recommendation_reason=recommendation_reason,
                warnings=warnings,
            )
            enriched_results.append(enriched)

        return enriched_results
