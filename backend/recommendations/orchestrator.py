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
        self, user_id: UUID, request: RecommendationRequest, session: Any = None
    ) -> RecommendationResponse:
        #
        """Run the end-to-end recommendation workflow."""
        try:
            import sentry_sdk as _sentry  #
            _sentry.set_tag("service", "recommendations")
            _sentry.set_user({"id": str(user_id)})
            _sentry.add_breadcrumb(
                category="recommendation",
                message=f"Generating recommendation for merchant: {request.merchant_name}",
                level="info",
                data={"amount": str(request.amount)},
            )
        except Exception:
            pass

        start_time = time.perf_counter()
        
        # 1. Resolve merchant using the new multi-stage pipeline, unless skipped
        from merchants.resolution_engine import resolve as resolve_merchant
        
        if request.skip_resolution or session is None:
            #
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
            try:
                import sentry_sdk as _sentry2
                _sentry2.add_breadcrumb(
                    category="recommendation",
                    message="No active cards found for user.",
                    level="info"
                )
            except Exception:
                pass
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
        #
        card_spend_map: dict[str, Decimal] = {}
        if session is not None:
            from datetime import date
            from sqlalchemy import select, func
            from transactions.models import Transaction, TransactionType, TransactionStatus

            today = date.today()
            quarter_start_month = ((today.month - 1) // 3) * 3 + 1
            quarter_start = date(today.year, quarter_start_month, 1)
            month_start = date(today.year, today.month, 1)

            card_ids = [c.id for c in user_cards]
            if card_ids:
                spend_stmt = (
                    select(
                        Transaction.user_card_id,
                        func.coalesce(func.sum(Transaction.amount), 0),
                    )
                    .where(
                        Transaction.user_card_id.in_(card_ids),
                        Transaction.transaction_date >= quarter_start,
                        Transaction.transaction_date <= today,
                        Transaction.transaction_type == TransactionType.PURCHASE,
                        Transaction.status.in_([TransactionStatus.PENDING, TransactionStatus.POSTED]),
                    )
                    .group_by(Transaction.user_card_id)
                )
                spend_result = await session.execute(spend_stmt)
                for row in spend_result.all():
                    card_spend_map[str(row[0])] = Decimal(str(row[1] or 0))

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

        # 8. Shadow rank: best catalog card NOT in wallet (gap affiliate wedge)
        # Shadow rank: evaluate candidate cards not in wallet with active partner links
        missing_best = None
        if session is not None:
            try:
                from repositories.card_repository import CardCatalogRepository
                from recommendations.utils import parse_rules_from_catalog as _parse

                catalog_repo = CardCatalogRepository(session)
                candidates = await catalog_repo.list_active_not_in_wallet(user_id)
                # Reuse same txn_context; shadow eval with 0 cumulative (new card = no spend)
                shadow_best_reward = None
                shadow_best_catalog = None
                shadow_best_eval = None

                for catalog in candidates:
                    affiliate_url = (getattr(catalog, "affiliate_url", None) or "").strip()
                    if not (getattr(catalog, "affiliate_active", False) and affiliate_url):
                        continue

                    rules = _parse(catalog, catalog.card_name)
                    if not rules:
                        continue
                    ev = engine_evaluate(txn_context.model_copy(update={"cumulative_spend": Decimal("0")}), rules)
                    reward_inr = float(ev.effective_reward_inr or Decimal("0"))
                    if shadow_best_reward is None or reward_inr > shadow_best_reward:
                        shadow_best_reward = reward_inr
                        shadow_best_catalog = catalog
                        shadow_best_eval = ev

                if shadow_best_catalog and shadow_best_reward is not None:
                    owned_best = opt_response.best_balanced_card or opt_response.best_cashback_card
                    owned_reward = float(owned_best.immediate_reward_value) if owned_best else 0.0
                    gap = round(float(shadow_best_reward) - owned_reward, 2)
                    affiliate_url = (getattr(shadow_best_catalog, "affiliate_url", None) or "").strip()
                    pct = (gap / owned_reward * 100) if owned_reward > 0 else (100 if gap > 0 else 0)

                    # Net-fee gate
                    annual_fee = float(shadow_best_catalog.annual_fee or 0)
                    waiver_threshold = float(shadow_best_catalog.fee_waiver_spend_threshold or 0)
                    if annual_fee <= 0:
                        net_ok = True
                    elif gap * 12 >= annual_fee:
                        net_ok = True
                    elif waiver_threshold > 0 and (gap * 2) >= (annual_fee * 0.5):
                        net_ok = True
                    else:
                        net_ok = gap >= annual_fee

                    if net_ok and gap >= 75 and pct >= 15 and shadow_best_reward > owned_reward:
                        why = ""
                        if shadow_best_eval and shadow_best_eval.matched_rule:
                            mr = shadow_best_eval.matched_rule
                            why = f"{mr.rule_name} — {mr.reward_rate * 100:.1f}% vs your best"
                        cap_note = None
                        if shadow_best_eval and shadow_best_eval.cap_result and shadow_best_eval.cap_result.was_capped:
                            cap_note = f"Capped ₹{shadow_best_eval.cap_result.cap_limit}"
                        from recommendations.schemas import MissingBestCard

                        missing_best = MissingBestCard(
                            card_id=shadow_best_catalog.id,
                            card_name=shadow_best_catalog.card_name,
                            bank_name=shadow_best_catalog.bank_name,
                            affiliate_url=affiliate_url,
                            incremental_reward=gap,
                            owned_best_reward=owned_reward,
                            global_best_reward=float(shadow_best_reward),
                            annual_fee=annual_fee,
                            fee_waiver_threshold=float(shadow_best_catalog.fee_waiver_spend_threshold) if shadow_best_catalog.fee_waiver_spend_threshold else None,
                            why_better=why,
                            cap_note=cap_note,
                        )
            except Exception as e:  #
                logger.warning(f"Shadow rank skipped: {e}")

        end_time = time.perf_counter()
        total_ms = (end_time - start_time) * 1000
        
        logger.info(
            f"Orchestration complete | Total: {total_ms:.2f}ms | Cards: {len(user_cards)} | gap={missing_best.incremental_reward if missing_best else 0}"
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
            warnings=[],
            missing_best_card=missing_best,
        )

    async def generate_recommendations_batch(
        self, user_id: UUID, requests: list[RecommendationRequest], session: Any = None
    ) -> list[RecommendationResponse]:
        """Evaluate multiple recommendation requests in a single database pass."""
        if not requests:
            return []

        from cards.enums import is_card_eligible_for_recommendation
        all_user_cards, _ = await self._user_card_service.get_user_cards(user_id, skip=0, limit=100)
        user_cards = [c for c in all_user_cards if is_card_eligible_for_recommendation(c.card_status)]

        if not user_cards:
            return [
                RecommendationResponse(
                    resolved_merchant_name=req.merchant_name,
                    resolution_confidence=1.0,
                    resolution_type="SKIPPED",
                    resolution_source="ALIAS",
                    merchant_id=None,
                    normalized_merchant=req.merchant_name,
                    category="other",
                    all_ranked_cards=[],
                    explanations=["Add credit cards to your wallet to unlock optimization intelligence."],
                    warnings=["No active cards found in wallet."],
                )
                for req in requests
            ]

        # 1-pass quarterly spend fetch
        card_spend_map: dict[str, Decimal] = {}
        if session is not None:
            from datetime import date
            from sqlalchemy import select, func
            from transactions.models import Transaction, TransactionType, TransactionStatus

            today = date.today()
            quarter_start_month = ((today.month - 1) // 3) * 3 + 1
            quarter_start = date(today.year, quarter_start_month, 1)

            card_ids = [c.id for c in user_cards]
            if card_ids:
                spend_stmt = (
                    select(
                        Transaction.user_card_id,
                        func.coalesce(func.sum(Transaction.amount), 0),
                    )
                    .where(
                        Transaction.user_card_id.in_(card_ids),
                        Transaction.transaction_date >= quarter_start,
                        Transaction.transaction_date <= today,
                        Transaction.transaction_type == TransactionType.PURCHASE,
                        Transaction.status.in_([TransactionStatus.PENDING, TransactionStatus.POSTED]),
                    )
                    .group_by(Transaction.user_card_id)
                )
                spend_result = await session.execute(spend_stmt)
                for row in spend_result.all():
                    card_spend_map[str(row[0])] = Decimal(str(row[1] or 0))

        # Pre-parse rules and fee waiver states once
        from recommendations.utils import get_card_name, get_catalog_card, parse_rules_from_catalog, build_transaction_context
        from fee_waiver.service import FeeWaiverService
        from merchants.resolution_engine import resolve as resolve_merchant, ResolutionResult
        from reward_engine.portfolio_optimization.engine import PortfolioOptimizationEngine
        from reward_engine.transaction_optimizer.engine import TransactionOptimizer

        portfolio_engine = PortfolioOptimizationEngine()
        prepared_cards = []
        for uc in user_cards:
            c_name = get_card_name(uc)
            cat_card = get_catalog_card(uc)
            rules = parse_rules_from_catalog(cat_card, c_name)
            waiver_state = FeeWaiverService.get_waiver_state_for_card(uc)
            q_spend = card_spend_map.get(str(uc.id), Decimal("0"))
            prepared_cards.append((uc, cat_card, c_name, rules, waiver_state, q_spend))

        merchant_cache: dict[str, Any] = {}
        responses: list[RecommendationResponse] = []

        for req in requests:
            if req.skip_resolution or session is None:
                resolve_res = ResolutionResult(
                    merchant_id=None,
                    merchant_name=req.merchant_name,
                    category="other",
                    merchant_type="UNKNOWN",
                    confidence=1.0,
                    resolution_type="SKIPPED",
                )
            elif req.merchant_name in merchant_cache:
                resolve_res = merchant_cache[req.merchant_name]
            else:
                resolve_res = await resolve_merchant(req.merchant_name, session)
                merchant_cache[req.merchant_name] = resolve_res

            canonical_merchant = resolve_res.merchant_name or req.merchant_name
            category = resolve_res.category or "other"
            txn_context = build_transaction_context(req, canonical_merchant, category)

            optimization_results = []
            for user_card, catalog_card, card_name, rules, fee_waiver_state, q_spend in prepared_cards:
                est_cumulative_reward = q_spend / Decimal("100")
                card_txn_context = txn_context.model_copy(update={"cumulative_spend": est_cumulative_reward})
                eval_result: EvaluationResult = engine_evaluate(card_txn_context, rules)
                opt_result = portfolio_engine.evaluate_portfolio_impact(
                    eval_result, user_card, catalog_card, fee_waiver_state, req.amount
                )
                optimization_results.append(opt_result)

            opt_response = TransactionOptimizer.optimize(
                raw_merchant_name=req.merchant_name,
                results=optimization_results,
                intent=req.intent,
            )

            responses.append(
                RecommendationResponse(
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
                    warnings=[],
                    missing_best_card=None,
                )
            )

        return responses

