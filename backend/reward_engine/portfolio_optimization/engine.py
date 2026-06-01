import logging
from typing import Any, Dict, List, Tuple
from decimal import Decimal
from pydantic import BaseModel
from reward_engine.schemas import EvaluationResult
from .objectives import RecommendationObjective
from .schemas import ScoreBreakdown, OptimizationResult

logger = logging.getLogger(__name__)

class PortfolioOptimizationEngine:
    """
    Deterministic engine for computing multi-objective longitudinal portfolio value.
    """
    
    def evaluate_portfolio_impact(
        self,
        eval_result: EvaluationResult,
        user_card: Any,
        catalog_card: Any,
        fee_waiver_state: Any,
        txn_amount: Decimal,
    ) -> OptimizationResult:
        """
        Compute the multi-dimensional score breakdown and identify reason codes.
        """
        txn_amount_float = float(txn_amount)
        immediate_reward = float(eval_result.effective_reward_inr)
        
        waiver_value = 0.0
        milestone_value = 0.0
        portfolio_health = 0.0
        reason_codes = []

        # 1. Fee Waiver Preservation Value
        if fee_waiver_state and not fee_waiver_state.is_achieved:
            remaining = float(fee_waiver_state.remaining_spend or 0)
            
            # Value at risk computed by the intelligence engine
            value_at_risk = fee_waiver_state.waiver_value_at_risk
            
            # Use actual value at risk without injecting theoretical fallback
            effective_fee_value = value_at_risk if value_at_risk > 0 else 0.0
            
            if remaining > 0:
                contribution = min(txn_amount_float, remaining)
                waiver_target = float(fee_waiver_state.waiver_target or 1)
                if waiver_target <= 0:
                    waiver_target = remaining
                    
                # Value = Prorated annual fee savings based on contribution relative to total target
                # Urgency modifier: if highly urgent, multiply the value slightly
                urgency_multiplier = 1.0
                if fee_waiver_state.urgency_level == "HIGH":
                    urgency_multiplier = 1.5
                elif fee_waiver_state.urgency_level == "ELEVATED":
                    urgency_multiplier = 1.2
                    
                waiver_value = (contribution / waiver_target) * effective_fee_value * urgency_multiplier
                reason_codes.append("FEE_WAIVER_PRESERVATION")
                
                if remaining <= txn_amount_float:
                    # The transaction triggers the waiver unlock!
                    waiver_value = effective_fee_value * urgency_multiplier
                    reason_codes.append("FEE_WAIVER_ACHIEVED")

        # 2. Milestone Acceleration Value
        if eval_result.matched_rule and "milestone" in eval_result.matched_rule.rule_type.lower():
            # MVP: Fixed acceleration bonus for milestone rules
            milestone_value = txn_amount_float * 0.02
            reason_codes.append("MILESTONE_ACCELERATION")

        # 3. Longitudinal Portfolio Value (Health)
        # e.g., balancing utilization or reviving dormant cards
        # MVP: small bonus if it has an annual fee but no current spend
        if float(getattr(user_card, "annual_spend", 0) or 0) < 1000 and float(getattr(user_card, "effective_annual_fee", 0) or 0) > 0:
            portfolio_health = txn_amount_float * 0.01
            reason_codes.append("DORMANT_PREMIUM_CARD")

        # Total Composite Score
        portfolio_score = immediate_reward + waiver_value + milestone_value + portfolio_health

        if immediate_reward > 0 and not reason_codes:
            reason_codes.append("IMMEDIATE_REWARD_ONLY")

        breakdown = ScoreBreakdown(
            immediate_reward=immediate_reward,
            waiver_value=waiver_value,
            milestone_value=milestone_value,
            portfolio_health=portfolio_health
        )
        
        card_name = catalog_card.card_name if catalog_card else getattr(user_card, "nickname", "Unknown Card")

        return OptimizationResult(
            card_id=str(user_card.id),
            card_name=card_name,
            evaluation=eval_result,
            portfolio_score=portfolio_score,
            portfolio_score_breakdown=breakdown,
            reason_codes=reason_codes
        )

    def rank_universe(self, results: List[OptimizationResult]) -> List[OptimizationResult]:
        """
        Takes a list of OptimizationResults and computes objective_rankings for each.
        Returns the list sorted deterministically by PORTFOLIO_OPTIMIZED score.
        """
        if not results:
            return []

        # Helper to rank by a specific key, descending. (We handle ties deterministically by card_id)
        def rank_by(key_fn) -> Dict[str, int]:
            sorted_res = sorted(results, key=lambda r: (key_fn(r), r.card_id), reverse=True)
            ranks = {}
            for i, r in enumerate(sorted_res):
                ranks[r.card_id] = i + 1
            return ranks

        # MAX_REWARD: Just immediate reward
        max_reward_ranks = rank_by(lambda r: r.portfolio_score_breakdown.immediate_reward)
        
        # FEE_WAIVER: Waiver value
        fee_waiver_ranks = rank_by(lambda r: r.portfolio_score_breakdown.waiver_value)
        
        # MILESTONE_ACCELERATION: Milestone value
        milestone_ranks = rank_by(lambda r: r.portfolio_score_breakdown.milestone_value)
        
        # PORTFOLIO_OPTIMIZED: The composite score
        portfolio_ranks = rank_by(lambda r: r.portfolio_score)
        
        # Assign rankings and explanations back
        for r in results:
            r.objective_rankings = {
                RecommendationObjective.MAX_REWARD: max_reward_ranks[r.card_id],
                RecommendationObjective.FEE_WAIVER: fee_waiver_ranks[r.card_id],
                RecommendationObjective.MILESTONE_ACCELERATION: milestone_ranks[r.card_id],
                RecommendationObjective.PORTFOLIO_OPTIMIZED: portfolio_ranks[r.card_id]
            }
            # Populate structured insights and legacy explanation
            self._generate_structured_insights(r, max_reward_ranks, portfolio_ranks, results)
            
        # Final sort by PORTFOLIO_OPTIMIZED
        sorted_final = sorted(results, key=lambda r: (r.portfolio_score, r.card_id), reverse=True)
        return sorted_final

    def _generate_structured_insights(self, result: OptimizationResult, max_reward_ranks: Dict[str, int], portfolio_ranks: Dict[str, int], all_results: List[OptimizationResult]) -> None:
        """
        Deterministic structured insights composition.
        Populates reason_title, reason_description, and other metadata.
        """
        is_top_portfolio = portfolio_ranks[result.card_id] == 1
        is_top_reward = max_reward_ranks[result.card_id] == 1
        
        result.cashback_value = result.portfolio_score_breakdown.immediate_reward
        result.strategic_value = result.portfolio_score - result.portfolio_score_breakdown.immediate_reward
        result.total_projected_value = result.portfolio_score
        
        # Determine confidence score (margin of victory heuristic)
        if is_top_portfolio and len(all_results) > 1:
            second_best = sorted(all_results, key=lambda r: r.portfolio_score, reverse=True)[1]
            margin = result.portfolio_score - second_best.portfolio_score
            result.confidence_score = min(0.99, 0.70 + (margin / (result.portfolio_score + 1.0)) * 0.3)
        else:
            result.confidence_score = 0.85
            
        result.recommendation_strength = "Strong" if result.confidence_score > 0.85 else "Moderate"
        
        title = "Balanced Portfolio Optimization"
        desc = "Contributes to balanced portfolio optimization."
        strategy = "General Optimization"
        factors = []
        
        if is_top_portfolio and not is_top_reward:
            top_reward_card = next((r for r in all_results if max_reward_ranks[r.card_id] == 1), None)
            delta = 0
            if top_reward_card:
                delta = top_reward_card.portfolio_score_breakdown.immediate_reward - result.portfolio_score_breakdown.immediate_reward
                
            if "FEE_WAIVER_ACHIEVED" in result.reason_codes:
                title = "Unlocks Annual Fee Waiver"
                desc = f"Earns ₹{delta:,.0f} less immediately, but this transaction triggers your annual fee waiver."
                strategy = "Fee Waiver Optimization"
            elif "FEE_WAIVER_PRESERVATION" in result.reason_codes:
                title = "Preserves Fee Waiver Progress"
                desc = f"Earns ₹{delta:,.0f} less immediately, but significantly preserves your fee waiver eligibility."
                strategy = "Fee Waiver Optimization"
            elif "MILESTONE_ACCELERATION" in result.reason_codes:
                title = "Accelerates Milestone Rewards"
                desc = f"Earns ₹{delta:,.0f} less immediately, but accelerates your progress towards a milestone unlock."
                strategy = "Milestone Optimization"
            elif "DORMANT_PREMIUM_CARD" in result.reason_codes:
                title = "Improves Portfolio Health"
                desc = f"Earns ₹{delta:,.0f} less immediately, but improves utilization for this dormant premium card."
                strategy = "Portfolio Utilization"
        else:
            if is_top_reward and is_top_portfolio:
                title = "Maximum Return & Value"
                desc = "Provides the highest immediate reward and aligns with long-term portfolio goals."
                strategy = "Maximum Return"
            elif "FEE_WAIVER_ACHIEVED" in result.reason_codes:
                title = "Unlocks Annual Fee Waiver"
                desc = "This transaction unlocks your annual fee waiver."
                strategy = "Fee Waiver Optimization"
            elif "FEE_WAIVER_PRESERVATION" in result.reason_codes:
                title = "Preserves Fee Waiver Progress"
                desc = "Helps preserve your annual fee waiver eligibility."
                strategy = "Fee Waiver Optimization"
            elif "MILESTONE_ACCELERATION" in result.reason_codes:
                title = "Accelerates Milestone Rewards"
                desc = "Accelerates milestone progress."
                strategy = "Milestone Optimization"
            elif "IMMEDIATE_REWARD_ONLY" in result.reason_codes:
                title = "Highest Immediate Cashback"
                desc = "Provides strong immediate reward value."
                strategy = "Maximum Return"
                
        # Populate supporting factors
        if result.portfolio_score_breakdown.waiver_value > 0 and strategy != "Fee Waiver Optimization":
            factors.append("Contributes to fee waiver")
        if result.portfolio_score_breakdown.milestone_value > 0 and strategy != "Milestone Optimization":
            factors.append("Contributes to milestone rewards")
        if result.portfolio_score_breakdown.portfolio_health > 0 and strategy != "Portfolio Utilization":
            factors.append("Improves card utilization")
            
        result.reason_title = title
        result.reason_description = desc
        result.primary_strategy = strategy
        result.supporting_factors = factors
        result.explanation = desc # Legacy fallback
