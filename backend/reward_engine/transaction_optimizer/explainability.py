from reward_engine.transaction_optimizer.schemas import OptimizationIntent

class TradeoffExplainer:
    """Generates calm, tradeoff-aware explanations for recommendations."""
    
    @staticmethod
    def explain(
        intent: OptimizationIntent,
        immediate_reward: float,
        fee_waiver_impact: float,
        is_best_overall: bool = False
    ) -> str:
        # High fee waiver impact
        if fee_waiver_impact > immediate_reward * 2 and fee_waiver_impact > 10.0:
            if intent == OptimizationIntent.SAVE_FEE_WAIVER:
                return "Preserves your annual fee waiver progress efficiently."
            return "Improves the likelihood of preserving your annual fee waiver, prioritizing long-term portfolio value over immediate rewards."
            
        # High immediate reward
        if immediate_reward > fee_waiver_impact * 2 and immediate_reward > 10.0:
            if intent == OptimizationIntent.MAX_REWARDS:
                return "Highest immediate return for this transaction."
            return "Strongest immediate rewards."
            
        # Balanced / Default
        if intent == OptimizationIntent.SIMPLIFY_DECISIONS:
            return "Reduces optimization complexity by consolidating spend."
            
        return "Balances immediate rewards with long-term portfolio value."
