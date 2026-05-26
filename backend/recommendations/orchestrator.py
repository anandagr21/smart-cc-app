"""
Module: backend.recommendations.orchestrator
Responsibility: Core logic for orchestrating the recommendation workflow.

Architectural Boundaries:
- Pure orchestration logic. Coordinates domain services and the pure reward engine.
- Contains no HTTP logic and no raw DB queries.
- Remains deterministic and testable by mocking underlying services.
"""

from __future__ import annotations

import logging
import time
from decimal import Decimal
from typing import Any
from uuid import UUID

logger = logging.getLogger(__name__)

from merchants.service import MerchantService
from recommendations.exceptions import NoCardsError
from recommendations.explainers import aggregate_explanations
from recommendations.schemas import RankedCardResponse, RecommendationRequest, RecommendationResponse
from recommendations.utils import build_transaction_context, get_catalog_card, get_card_name
from reward_engine.evaluator import evaluate as engine_evaluate
from reward_engine.ranking import rank_cards
from reward_engine.ranking_schemas import CardEvaluationInput, RankingResult
from reward_engine.schemas import EvaluationResult, NormalizedRuleConfig
from reward_engine.scoring import score_recommendation
from reward_engine.utils import round_inr
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
        start_time = time.perf_counter()
        
        # 1. Normalize merchant
        normalize_res = self._merchant_service.normalize_merchant(request.merchant_name)
        canonical_merchant = normalize_res.canonical_name
        category = normalize_res.category or "other"

        # 2. Fetch user cards
        user_cards, _ = await self._user_card_service.get_user_cards(user_id, skip=0, limit=100)
        
        if not user_cards:
            return RecommendationResponse(
                normalized_merchant=canonical_merchant,
                category=category,
                best_card=None,
                ranked_cards=[],
                explanations=["Add credit cards to your wallet to unlock optimization intelligence."],
                warnings=["No active cards found in wallet."],
            )

        # 3. Build Transaction Context
        txn_context = build_transaction_context(request, canonical_merchant, category)
        
        enrichment_time = time.perf_counter()

        # 4 & 5. Evaluate each card
        from reward_engine.portfolio_optimization.engine import PortfolioOptimizationEngine
        portfolio_engine = PortfolioOptimizationEngine()
        
        eval_inputs: list[CardEvaluationInput] = []
        optimization_results = []
        
        for user_card in user_cards:
            card_id_str = str(user_card.card_catalog_id)
            
            card_name = get_card_name(user_card)
            catalog_card = get_catalog_card(user_card)

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
            
            # Phase 2: Compute fee waiver intelligence and portfolio optimization
            fee_waiver_data = get_waiver_progress(user_card, catalog_card) if catalog_card else {}
            
            opt_result = portfolio_engine.evaluate_portfolio_impact(
                eval_result, user_card, catalog_card, fee_waiver_data, request.amount
            )
            optimization_results.append(opt_result)

        # 6. Rank cards using PortfolioOptimizationEngine
        ranked_optimization_results = portfolio_engine.rank_universe(optimization_results)

        # Generate legacy RankingResult for aggregate explanations (if needed)
        # We can map back to CardEvaluationInput for the legacy `rank_cards` if `aggregate_explanations` needs it, 
        # or we just build explanations directly.
        # MVP: Build a dummy RankingResult to keep aggregate_explanations working
        for r in ranked_optimization_results:
            eval_inputs.append(
                CardEvaluationInput(
                    card_id=r.card_id,
                    card_name=r.card_name,
                    evaluation=r.evaluation,
                    annual_fee=0,
                )
            )
        legacy_ranking_result = rank_cards(eval_inputs)

        # 7. Format response
        explanations, warnings = aggregate_explanations(normalize_res, legacy_ranking_result)

        ranked_cards_response = []
        for i, opt_res in enumerate(ranked_optimization_results):
            # Find the legacy eval warnings
            legacy_eval = next((e for e in legacy_ranking_result.ranked if e.card_id == opt_res.card_id), None)
            card_warnings = legacy_eval.warnings if legacy_eval else []

            ranked_cards_response.append(
                RankedCardResponse(
                    card_id=opt_res.card_id,
                    card_name=opt_res.card_name,
                    rank=i + 1,  # Master portfolio rank
                    
                    effective_reward_value=round_inr(Decimal(str(opt_res.portfolio_score_breakdown.immediate_reward))),
                    cashback_amount=opt_res.evaluation.cashback_amount,
                    reward_points=opt_res.evaluation.reward_points,
                    reward_type=opt_res.evaluation.reward_type,
                    
                    recommendation_reason=opt_res.explanation, # Fallback
                    warnings=card_warnings,
                    
                    # New engine fields
                    portfolio_score=opt_res.portfolio_score,
                    immediate_reward_value=opt_res.portfolio_score_breakdown.immediate_reward,
                    long_term_portfolio_value=opt_res.portfolio_score_breakdown.portfolio_health,
                    waiver_acceleration=opt_res.portfolio_score_breakdown.waiver_value,
                    milestone_acceleration=opt_res.portfolio_score_breakdown.milestone_value,
                    
                    portfolio_score_breakdown=opt_res.portfolio_score_breakdown.model_dump(),
                    objective_rankings={k.value: v for k, v in opt_res.objective_rankings.items()},
                    reason_codes=opt_res.reason_codes,
                    explanation=opt_res.explanation,
                )
            )

        best_card = legacy_ranking_result.top_card_id
        if ranked_cards_response:
            best_card = ranked_cards_response[0].card_name

        end_time = time.perf_counter()
        total_ms = (end_time - start_time) * 1000
        enrich_ms = (enrichment_time - start_time) * 1000
        rank_ms = (end_time - enrichment_time) * 1000
        
        logger.info(
            f"Orchestration complete | Total: {total_ms:.2f}ms "
            f"| Enrichment: {enrich_ms:.2f}ms | Eval/Rank: {rank_ms:.2f}ms "
            f"| Cards: {len(user_cards)}"
        )

        return RecommendationResponse(
            normalized_merchant=canonical_merchant,
            category=category,
            best_card=best_card,
            ranked_cards=ranked_cards_response,
            explanations=explanations,
            warnings=warnings,
        )
