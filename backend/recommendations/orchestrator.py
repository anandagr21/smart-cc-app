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
from recommendations.schemas import OptimizerRankedCard, RecommendationRequest, RecommendationResponse
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
        self, user_id: UUID, request: RecommendationRequest, session: Any
    ) -> RecommendationResponse:
        """Run the end-to-end recommendation workflow."""
        import sentry_sdk
        sentry_sdk.set_tag("service", "recommendations")
        sentry_sdk.set_user({"id": str(user_id)})
        sentry_sdk.add_breadcrumb(
            category="recommendation",
            message=f"Generating recommendation for merchant: {request.merchant_name}",
            level="info",
            data={"amount": str(request.amount)}
        )

        start_time = time.perf_counter()
        
        # 1. Resolve merchant using the new multi-stage pipeline, unless skipped
        from merchants.resolution_engine import resolve as resolve_merchant
        
        if request.skip_resolution:
            # If skipping, we mock a ResolutionResult with original data
            from merchants.resolution_engine import ResolutionResult
            resolve_res = ResolutionResult(
                merchant_id=None,
                merchant_name=request.merchant_name,
                category="other",
                merchant_type="UNKNOWN",
                confidence=1.0,
                resolution_type="SKIPPED"
            )
        else:
            resolve_res = await resolve_merchant(request.merchant_name, session)
        
        canonical_merchant = resolve_res.merchant_name or request.merchant_name
        category = resolve_res.category or "other"

        # 2. Fetch user cards
        from cards.enums import is_card_eligible_for_recommendation
        all_user_cards, _ = await self._user_card_service.get_user_cards(user_id, skip=0, limit=100)
        
        # Filter out inactive/unusable cards before any intelligence logic
        user_cards = [c for c in all_user_cards if is_card_eligible_for_recommendation(c.card_status)]
        
        if not user_cards:
            sentry_sdk.add_breadcrumb(
                category="recommendation",
                message="No active cards found for user.",
                level="info"
            )
            return RecommendationResponse(
                resolved_merchant_name=resolve_res.merchant_name,
                resolution_confidence=resolve_res.confidence,
                resolution_type=resolve_res.resolution_type,
                resolution_source="ALIAS" if resolve_res.resolution_type == "ALIAS" else ("LLM" if "LLM" in resolve_res.resolution_type else "FUZZY"),
                merchant_id=resolve_res.merchant_id,
                normalized_merchant=canonical_merchant,
                category=category,
                all_ranked_cards=[],
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

        # Pre-fetch cumulative spend per card for the full quarter so caps work
        from datetime import date
        from sqlalchemy import select, func
        from transactions.models import Transaction, TransactionType, TransactionStatus

        today = date.today()
        quarter_start_month = ((today.month - 1) // 3) * 3 + 1
        quarter_start = date(today.year, quarter_start_month, 1)
        month_start = date(today.year, today.month, 1)
        card_spend_map: dict[str, Decimal] = {}

        for user_card in user_cards:
            # Use quarter range for quarterly caps, month for monthly tracking
            spend_stmt = (
                select(func.coalesce(func.sum(Transaction.amount), 0))
                .where(
                    Transaction.user_card_id == user_card.id,
                    Transaction.transaction_date >= quarter_start,
                    Transaction.transaction_date <= today,
                    Transaction.transaction_type == TransactionType.PURCHASE,
                    Transaction.status.in_([TransactionStatus.PENDING, TransactionStatus.POSTED]),
                )
            )
            spend_result = await session.execute(spend_stmt)
            card_spend_map[str(user_card.id)] = Decimal(str(spend_result.scalar() or 0))

        for user_card in user_cards:
            card_id_str = str(user_card.card_catalog_id)
            
            card_name = get_card_name(user_card)
            catalog_card = get_catalog_card(user_card)

            from recommendations.utils import parse_rules_from_catalog
            normalized_rules = parse_rules_from_catalog(catalog_card, card_name)

            # Pass cumulative reward-equivalent (approximate) for cap enforcement.
            # Divide quarterly spend by 100 to estimate ~1% reward rate.
            # More accurate than raw INR spend vs reward cap mismatch.
            quarterly_spend = card_spend_map.get(str(user_card.id), Decimal("0"))
            est_cumulative_reward = quarterly_spend / Decimal("100")
            card_txn_context = txn_context.model_copy(update={"cumulative_spend": est_cumulative_reward})
            eval_result: EvaluationResult = engine_evaluate(card_txn_context, normalized_rules)
            
            # Phase 2: Compute fee waiver intelligence and portfolio optimization
            from fee_waiver.service import FeeWaiverService
            fee_waiver_state = FeeWaiverService.get_waiver_state_for_card(user_card)
            
            opt_result = portfolio_engine.evaluate_portfolio_impact(
                eval_result, user_card, catalog_card, fee_waiver_state, request.amount
            )
            optimization_results.append(opt_result)

        # 6 & 7. Delegate to Transaction Optimizer
        from reward_engine.transaction_optimizer.engine import TransactionOptimizer
        
        opt_response = TransactionOptimizer.optimize(
            raw_merchant_name=request.merchant_name,
            results=optimization_results,
            intent=request.intent
        )

        end_time = time.perf_counter()
        total_ms = (end_time - start_time) * 1000
        
        logger.info(
            f"Orchestration complete | Total: {total_ms:.2f}ms | Cards: {len(user_cards)}"
        )
        
        return RecommendationResponse(
            resolved_merchant_name=resolve_res.merchant_name,
            resolution_confidence=resolve_res.confidence,
            resolution_type=resolve_res.resolution_type,
            resolution_source="ALIAS" if resolve_res.resolution_type == "ALIAS" else ("LLM" if "LLM" in resolve_res.resolution_type else "FUZZY"),
            merchant_id=resolve_res.merchant_id,
            normalized_merchant=opt_response.normalized_merchant,
            category=opt_response.category,
            best_cashback_card=opt_response.best_cashback_card,
            best_fee_waiver_card=opt_response.best_fee_waiver_card,
            best_balanced_card=opt_response.best_balanced_card,
            best_simplify_card=opt_response.best_simplify_card,
            all_ranked_cards=opt_response.all_ranked_cards,
            explanations=["Optimizer evaluated all scenarios."],
            warnings=[]
        )
