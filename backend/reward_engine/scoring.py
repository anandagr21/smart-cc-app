"""
Module: backend.reward_engine.scoring
Responsibility: Weighted recommendation scoring engine.
"""

from decimal import Decimal
from typing import Any

from reward_engine.schemas import EvaluationResult


def score_recommendation(
    eval_result: EvaluationResult, 
    user_card: Any, 
    catalog_card: Any,
    fee_waiver_data: dict[str, Any],
    txn_amount: Decimal
) -> dict[str, Any]:
    """
    Produce a weighted score for a recommendation.
    
    Factors:
    - Cashback Value (Primary)
    - Fee Waiver Progress
    - Milestone Progress
    - Cap Status
    """
    
    # Base score is strictly the effective INR value of the reward
    base_score = float(eval_result.effective_reward_inr)
    
    optimization_factors = []
    tradeoffs = []
    waiver_impact_msg = None
    milestone_impact_msg = None
    cap_status_msg = None
    
    bonus_score = 0.0
    
    # 1. Fee Waiver Optimization
    # If the user is close to the fee waiver, we assign a slight bonus so that it
    # breaks ties or overcomes marginal cashback differences.
    if fee_waiver_data.get("fee_waiver_threshold"):
        if not fee_waiver_data.get("waiver_achieved"):
            remaining = float(fee_waiver_data.get("remaining_spend_for_waiver", 0))
            annual_fee = float(fee_waiver_data.get("annual_fee", 0))
            waiver_threshold = float(fee_waiver_data.get("fee_waiver_threshold", 0))
            
            if remaining > 0 and annual_fee > 0 and waiver_threshold > 0:
                txn_amount_float = float(txn_amount)
                contribution = min(txn_amount_float, remaining)
                contribution_percent = (contribution / waiver_threshold) * 100
                
                waiver_impact_msg = f"Contributes {contribution_percent:.1f}% toward fee waiver."
                optimization_factors.append("Helps achieve annual fee waiver.")
                
                if remaining <= txn_amount_float:
                    # Transaction completes the waiver! Expected value is the full annual fee.
                    bonus_score += annual_fee
                else:
                    # Transaction contributes to the waiver. Expected value is proportional.
                    bonus_score += (contribution / waiver_threshold) * annual_fee
                
        else:
            waiver_impact_msg = "Waiver already achieved."
            
    # 2. Cap Optimization
    # Check if a cap was hit
    if eval_result.cap_result and eval_result.cap_result.was_capped:
        cap_status_msg = "Category reward cap reached."
        tradeoffs.append("Reward was capped due to monthly limits.")
        # The base_score already reflects the capped amount, no penalty needed here.
    
    # 3. Milestone Progress (MVP: Placeholder logic based on rule properties if present)
    # If the matched rule is explicitly a milestone rule, we could add a bonus.
    if eval_result.matched_rule and "milestone" in eval_result.matched_rule.rule_type.lower():
        milestone_impact_msg = "Progresses towards a major milestone."
        optimization_factors.append("Milestone progress.")
        bonus_score += float(txn_amount) * 0.02 # Boost milestone-oriented rules
        
    final_score = base_score + bonus_score
    
    reasoning_summary = ""
    if bonus_score > 0 and base_score > 0:
        reasoning_summary = "Excellent balance of immediate rewards and long-term goals."
    elif base_score > 0:
        reasoning_summary = "Strong immediate reward value."
    else:
        reasoning_summary = "No significant immediate rewards or strategic advantages."
        
    return {
        "final_score": final_score,
        "score_breakdown": {
            "cashback_score": base_score,
            "bonus_score": bonus_score
        },
        "optimization_factors": optimization_factors,
        "tradeoffs": tradeoffs,
        "waiver_impact": waiver_impact_msg,
        "milestone_impact": milestone_impact_msg,
        "cap_status": cap_status_msg,
        "reasoning_summary": reasoning_summary
    }
