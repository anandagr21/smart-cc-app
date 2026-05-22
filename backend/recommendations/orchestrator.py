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
from reward_engine.scoring import score_recommendation
from rewards.service import RewardRuleService
from services.card_service import UserCardService
from cards.intelligence.fee_waiver import get_waiver_progress


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
        """Run the end-to-end recommendation workflow."""
        # 1. Normalize merchant
        normalize_res = self._merchant_service.normalize_merchant(request.merchant_name)
        canonical_merchant = normalize_res.canonical_name
        category = normalize_res.category or "other"

        # 2. Fetch user cards
        user_cards, _ = await self._user_card_service.get_user_cards(user_id, skip=0, limit=100)
        
        if not user_cards:
            raise NoCardsError()

        # 3. Build Transaction Context
        txn_context = build_transaction_context(request, canonical_merchant, category)

        # 4 & 5. Evaluate each card
        eval_inputs: list[CardEvaluationInput] = []
        card_intelligence = {}
        
        for user_card in user_cards:
            card_id_str = str(user_card.card_catalog_id)
            
            card_name = user_card.nickname
            if not card_name:
                card_name = user_card.card_details.card_name if getattr(user_card, "card_details", None) else "Unknown Card"

            # Fetch rules
            rules_resp = await self._reward_rule_service.get_card_active_rules(card_id_str)
            
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
            
            # Phase 2: Compute fee waiver intelligence and score
            fee_waiver_data = get_waiver_progress(user_card, user_card.card_details) if getattr(user_card, "card_details", None) else {}
            
            score_data = score_recommendation(
                eval_result, user_card, getattr(user_card, "card_details", None), fee_waiver_data, request.amount
            )
            
            card_intelligence[card_id_str] = score_data

            # Build ranking input. Overwrite effective_reward_inr with the final multi-factor score.
            # We clone eval_result to avoid mutating shared state if any, and inject score.
            # However, for pure ranking, we pass the eval_result but we can override the effective reward 
            # to be the final score so the ranker ranks by multi-factor score.
            eval_result.effective_reward_inr = score_data["final_score"]

            eval_inputs.append(
                CardEvaluationInput(
                    card_id=card_id_str,
                    card_name=card_name,
                    evaluation=eval_result,
                    annual_fee=0, 
                )
            )

        # 6. Rank cards
        ranking_result: RankingResult = rank_cards(eval_inputs)

        # 7. Format response
        explanations, warnings = aggregate_explanations(normalize_res, ranking_result)

        ranked_cards_response = []
        for r in ranking_result.ranked:
            intel = card_intelligence.get(r.card_id, {})
            # Overwrite the recommendation_reason with our reasoning summary if it's stronger
            rec_reason = intel.get("reasoning_summary") or r.recommendation_reason
            
            ranked_cards_response.append(
                RankedCardResponse(
                    card_id=r.card_id,
                    card_name=r.card_name,
                    rank=r.rank,
                    effective_reward_value=intel.get("score_breakdown", {}).get("cashback_score", r.effective_reward_inr), # Show actual cashback
                    cashback_amount=r.cashback_amount,
                    reward_points=r.reward_points,
                    reward_type=r.reward_type,
                    recommendation_reason=rec_reason,
                    warnings=r.warnings,
                    optimization_factors=intel.get("optimization_factors", []),
                    tradeoffs=intel.get("tradeoffs", []),
                    waiver_impact=intel.get("waiver_impact"),
                    milestone_impact=intel.get("milestone_impact"),
                    cap_status=intel.get("cap_status"),
                    reasoning_summary=intel.get("reasoning_summary", "")
                )
            )

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
