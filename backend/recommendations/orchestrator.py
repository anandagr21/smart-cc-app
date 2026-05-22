"""
Module: backend.recommendations.orchestrator
Responsibility: Core logic for orchestrating the recommendation workflow.

Architectural Boundaries:
- Pure orchestration logic. Coordinates domain services and the pure reward engine.
- Contains no HTTP logic and no raw DB queries.
- Remains deterministic and testable by mocking underlying services.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from merchants.service import MerchantService
from recommendations.exceptions import NoCardsError
from recommendations.explainers import aggregate_explanations
from recommendations.schemas import RankedCardResponse, RecommendationRequest, RecommendationResponse
from recommendations.utils import build_transaction_context
from reward_engine.evaluator import evaluate as engine_evaluate
from reward_engine.ranking import rank_cards
from reward_engine.ranking_schemas import CardEvaluationInput, RankingResult
from reward_engine.schemas import EvaluationResult, NormalizedRuleConfig
from rewards.service import RewardRuleService
from services.card_service import UserCardService


class RecommendationOrchestrator:
    """Orchestrates the deterministic recommendation workflow."""

    def __init__(
        self,
        merchant_service: MerchantService,
        user_card_service: UserCardService,
        reward_rule_service: RewardRuleService,
    ) -> None:
        self._merchant_service = merchant_service
        self._user_card_service = user_card_service
        self._reward_rule_service = reward_rule_service

    async def generate_recommendation(
        self, user_id: UUID, request: RecommendationRequest
    ) -> RecommendationResponse:
        """Run the end-to-end recommendation workflow.

        1. Normalize the merchant name.
        2. Fetch user's active cards.
        3. Fetch active rules for each card.
        4. Build TransactionContext.
        5. Invoke reward engine evaluator for each card.
        6. Rank results via reward engine ranker.
        7. Aggregate explanations and format response.
        """
        # 1. Normalize merchant
        normalize_res = self._merchant_service.normalize_merchant(request.merchant_name)
        canonical_merchant = normalize_res.canonical_name
        category = normalize_res.category or "other"

        # 2. Fetch user cards
        user_cards, _ = await self._user_card_service.get_user_cards(user_id, skip=0, limit=100)
        
        # Filter for active cards. We assume UserCardResponse has an is_active flag.
        # If not, we just use all returned cards. The schema usually handles this.
        # Let's assume all fetched cards are candidate cards for now.
        if not user_cards:
            raise NoCardsError()

        # 3. Build Transaction Context
        txn_context = build_transaction_context(request, canonical_merchant, category)

        # 4 & 5. Evaluate each card
        eval_inputs: list[CardEvaluationInput] = []
        for user_card in user_cards:
            # Get catalog card details
            card_id_str = str(user_card.card_catalog_id)
            
            # Use user's nickname if available, fallback to catalog card name
            card_name = user_card.nickname
            if not card_name:
                card_name = user_card.card_details.card_name if getattr(user_card, "card_details", None) else "Unknown Card"

            # Fetch rules
            rules_resp = await self._reward_rule_service.get_card_active_rules(card_id_str)
            
            # Map RewardRuleResponse to NormalizedRuleConfig for the engine
            normalized_rules = [
                NormalizedRuleConfig(
                    rule_name=r.rule_name,
                    rule_type=r.rule_type,
                    priority=r.priority,
                    config=r.rule_config,
                )
                for r in rules_resp
            ]

            # Pure evaluate
            eval_result: EvaluationResult = engine_evaluate(txn_context, normalized_rules)

            # Build ranking input
            eval_inputs.append(
                CardEvaluationInput(
                    card_id=card_id_str,
                    card_name=card_name,
                    evaluation=eval_result,
                    annual_fee=0, # Could be fetched from card_details if available
                )
            )

        # 6. Rank cards
        ranking_result: RankingResult = rank_cards(eval_inputs)

        # 7. Format response
        explanations, warnings = aggregate_explanations(normalize_res, ranking_result)

        ranked_cards_response = [
            RankedCardResponse(
                card_id=r.card_id,
                card_name=r.card_name,
                rank=r.rank,
                effective_reward_value=r.effective_reward_inr,
                cashback_amount=r.cashback_amount,
                reward_points=r.reward_points,
                reward_type=r.reward_type,
                recommendation_reason=r.recommendation_reason,
                warnings=r.warnings,
            )
            for r in ranking_result.ranked
        ]

        best_card = ranking_result.top_card_id
        if ranked_cards_response:
            best_card = ranked_cards_response[0].card_name

        return RecommendationResponse(
            normalized_merchant=canonical_merchant,
            category=category,
            best_card=best_card,
            ranked_cards=ranked_cards_response,
            explanations=explanations,
            warnings=warnings,
        )
