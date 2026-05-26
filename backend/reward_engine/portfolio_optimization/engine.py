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
        fee_waiver_data: dict[str, Any],
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
        if fee_waiver_data.get("effective_fee_waiver_threshold") and not fee_waiver_data.get("waiver_achieved"):
            remaining = float(fee_waiver_data.get("remaining_spend_for_waiver", 0) or 0)
            annual_fee = float(fee_waiver_data.get("effective_annual_fee", 0) or 0)
            
            # If annual fee is unknown/0, use a nominal fallback of 1000 so the algorithm still ranks the waiver correctly
            effective_fee_value = annual_fee if annual_fee > 0 else 1000.0
            
            if remaining > 0:
                contribution = min(txn_amount_float, remaining)
                # Value = Prorated annual fee savings based on contribution relative to remaining spend
                # This ensures that as you get closer to the waiver (lower remaining),
                # the value of each rupee spent towards it increases.
                waiver_value = (contribution / remaining) * effective_fee_value
                reason_codes.append("FEE_WAIVER_PRESERVATION")
                
                if remaining <= txn_amount_float:
                    # The transaction triggers the waiver unlock!
                    waiver_value = effective_fee_value
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
            r.explanation = self._generate_explanation(r, max_reward_ranks, portfolio_ranks, results)
            
        # Final sort by PORTFOLIO_OPTIMIZED
        sorted_final = sorted(results, key=lambda r: (r.portfolio_score, r.card_id), reverse=True)
        return sorted_final

    def _generate_explanation(self, result: OptimizationResult, max_reward_ranks: Dict[str, int], portfolio_ranks: Dict[str, int], all_results: List[OptimizationResult]) -> str:
        """
        Deterministic explanation composition. 
        MUST explain why immediate rewards were sacrificed if this card is portfolio optimal but not max reward.
        """
        is_top_portfolio = portfolio_ranks[result.card_id] == 1
        is_top_reward = max_reward_ranks[result.card_id] == 1
        
        if is_top_portfolio and not is_top_reward:
            # Find the top reward card to explain the delta
            top_reward_card = next((r for r in all_results if max_reward_ranks[r.card_id] == 1), None)
            if top_reward_card:
                delta = top_reward_card.portfolio_score_breakdown.immediate_reward - result.portfolio_score_breakdown.immediate_reward
                
                # Check why it won portfolio
                if "FEE_WAIVER_ACHIEVED" in result.reason_codes:
                    return f"Earns ₹{delta:,.0f} less immediately, but this transaction triggers your annual fee waiver."
                elif "FEE_WAIVER_PRESERVATION" in result.reason_codes:
                    return f"Earns ₹{delta:,.0f} less immediately, but significantly preserves your fee waiver eligibility."
                elif "MILESTONE_ACCELERATION" in result.reason_codes:
                    return f"Earns ₹{delta:,.0f} less immediately, but accelerates your progress towards a milestone unlock."
                elif "DORMANT_PREMIUM_CARD" in result.reason_codes:
                    return f"Earns ₹{delta:,.0f} less immediately, but improves utilization for this dormant premium card."
                    
        # General explanations
        if is_top_reward and is_top_portfolio:
            return "Provides the highest immediate reward and aligns with portfolio goals."
            
        if "FEE_WAIVER_ACHIEVED" in result.reason_codes:
            return "This transaction unlocks your annual fee waiver."
            
        if "FEE_WAIVER_PRESERVATION" in result.reason_codes:
            return "Helps preserve your annual fee waiver eligibility."
            
        if "MILESTONE_ACCELERATION" in result.reason_codes:
            return "Accelerates milestone progress."
            
        if "IMMEDIATE_REWARD_ONLY" in result.reason_codes:
            return "Strong immediate reward value."
            
        return "Contributes to balanced portfolio optimization."
