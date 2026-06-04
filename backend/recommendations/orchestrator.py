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
        self, user_id: UUID, request: RecommendationRequest
    ) -> RecommendationResponse:
        """Run the end-to-end recommendation workflow."""
        start_time = time.perf_counter()
        
        # 1. Normalize merchant
        normalize_res = self._merchant_service.normalize_merchant(request.merchant_name)
        canonical_merchant = normalize_res.canonical_name
        category = normalize_res.category or "other"

        # 2. Fetch user cards
        from cards.enums import is_card_eligible_for_recommendation
        all_user_cards, _ = await self._user_card_service.get_user_cards(user_id, skip=0, limit=100)
        
        # Filter out inactive/unusable cards before any intelligence logic
        user_cards = [c for c in all_user_cards if is_card_eligible_for_recommendation(c.card_status)]
        
        if not user_cards:
            return RecommendationResponse(
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
        
        for user_card in user_cards:
            card_id_str = str(user_card.card_catalog_id)
            
            card_name = get_card_name(user_card)
            catalog_card = get_catalog_card(user_card)

            # Parse rules from catalog_card directly (bypassing legacy RewardRule table)
            normalized_rules = []
            
            raw_rules = catalog_card.reward_rules_json or []
            if isinstance(raw_rules, dict) and "rules" in raw_rules:
                raw_rules = raw_rules["rules"]
                
            for i, r in enumerate(raw_rules):
                category = str(r.get("category_name", "other"))
                r_type = str(r.get("reward_type", "cashback")).lower()
                multiplier = float(r.get("multiplier", 0.0))
                
                config = {
                    "reward_type": r_type,
                    "reward_rate": (multiplier / 100.0) if r_type == "cashback" else 0.0,
                    "points_multiplier": multiplier if r_type != "cashback" else 1.0,
                    "rupee_value": float(catalog_card.base_point_value),
                    "spend_unit": 100,
                    "payment_mode": "any",
                    "cap": float(r.get("cap_limit", 0) or 0) if r.get("has_cap") else 0.0,
                    "scope": "monthly" if r.get("cap_cycle") == "monthly" else "transaction",
                    "excluded_merchants": r.get("merchant_exclusions", []),
                }
                
                category_lower = category.lower()
                is_base = any(b in category_lower for b in ["catch", "other", "base", "all spend", "any spend", "default"])
                
                rule_type = "category_bonus" if not is_base else "base_reward"
                priority = 10 if not is_base else 100
                
                if not is_base:
                    # Determine if this is a strict merchant rule vs a broader category rule with examples
                    is_category = any(w in category_lower for w in ["online", "shopping", "spends", "category", "etc"])
                    
                    merchant_keywords = ["amazon", "flipkart", "myntra", "zomato", "swiggy", "makemytrip", "cleartrip", "bigbasket"]
                    found_merchants = [m for m in merchant_keywords if m in category_lower]
                    
                    if found_merchants and not is_category:
                        # It's a strict merchant rule (e.g. "Amazon Prime", "Swiggy orders")
                        # Create a copy for the first matched merchant to keep it simple, or we could duplicate.
                        # For now, just use the first matched merchant.
                        config["merchant"] = found_merchants[0]
                        rule_type = "merchant_bonus"
                        priority = 1
                    else:
                        # Map LLM human-readable strings to canonical categories
                        if any(w in category_lower for w in ["dining", "restaurant"]):
                            config["category"] = "dining"
                        elif "food" in category_lower:
                            config["category"] = "food"
                        elif any(w in category_lower for w in ["travel", "flight", "hotel"]):
                            config["category"] = "travel"
                        elif any(w in category_lower for w in ["fuel", "petrol", "gas"]):
                            config["category"] = "fuel"
                        elif any(w in category_lower for w in ["grocery", "groceries", "supermarket"]):
                            config["category"] = "grocery"
                        elif any(w in category_lower for w in ["utility", "utilities", "bill"]):
                            config["category"] = "utilities"
                        elif any(w in category_lower for w in ["online", "shopping"]):
                            config["category"] = "ecommerce"
                        else:
                            config["category"] = category
                
                normalized_rules.append(
                    NormalizedRuleConfig(
                        rule_name=f"{card_name} - {category}",
                        rule_type=rule_type,
                        priority=priority,
                        config=config,
                    )
                )

            # Pure evaluate
            eval_result: EvaluationResult = engine_evaluate(txn_context, normalized_rules)
            
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
