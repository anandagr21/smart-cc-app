from reward_engine.transaction_optimizer.schemas import OptimizationIntent

class TransactionScorer:
    """Computes blended value based on user intent."""
    
    @staticmethod
    def compute_blended_score(
        intent: OptimizationIntent,
        immediate_reward: float,
        fee_waiver_impact: float,
        simplification_score: float
    ) -> float:
        """
        Weights the raw scores based on the selected OptimizationIntent.
        """
        if intent == OptimizationIntent.MAX_REWARDS:
            return immediate_reward * 1.0 + fee_waiver_impact * 0.1 + simplification_score * 0.0
            
        elif intent == OptimizationIntent.SAVE_FEE_WAIVER:
            return immediate_reward * 0.2 + fee_waiver_impact * 1.0 + simplification_score * 0.0
            
        elif intent == OptimizationIntent.SIMPLIFY_DECISIONS:
            return immediate_reward * 0.4 + fee_waiver_impact * 0.4 + simplification_score * 1.0
            
        else: # BALANCED
            return immediate_reward * 0.6 + fee_waiver_impact * 0.6 + simplification_score * 0.2
