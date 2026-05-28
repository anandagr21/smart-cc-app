from typing import List
from reward_engine.portfolio_optimization.schemas import OptimizationResult
from reward_engine.transaction_optimizer.schemas import OptimizationIntent, OptimizerRankedCard, OptimizationResponse
from reward_engine.transaction_optimizer.scoring import TransactionScorer
from reward_engine.transaction_optimizer.explainability import TradeoffExplainer
from merchant_intelligence.service import MerchantIntelligenceService

class TransactionOptimizer:
    """
    Thin orchestration layer over the core portfolio optimization primitives.
    It takes the raw OptimizationResults and scores them based on intent.
    """
    
    @staticmethod
    def optimize(
        raw_merchant_name: str,
        results: List[OptimizationResult], 
        intent: OptimizationIntent
    ) -> OptimizationResponse:
        
        # 1. Normalize Merchant
        merchant = MerchantIntelligenceService.normalize_merchant(raw_merchant_name)
        
        # 2. Score each card according to intent
        ranked_cards: List[OptimizerRankedCard] = []
        for r in results:
            immediate_reward = float(r.portfolio_score_breakdown.immediate_reward)
            fee_waiver_impact = float(r.portfolio_score_breakdown.waiver_value)
            simplification_score = float(r.portfolio_score_breakdown.portfolio_health)
            
            blended_score = TransactionScorer.compute_blended_score(
                intent=intent,
                immediate_reward=immediate_reward,
                fee_waiver_impact=fee_waiver_impact,
                simplification_score=simplification_score
            )
            
            explanation = TradeoffExplainer.explain(
                intent=intent,
                immediate_reward=immediate_reward,
                fee_waiver_impact=fee_waiver_impact,
                is_best_overall=False
            )
            
            card = OptimizerRankedCard(
                card_id=r.card_id,
                card_name=r.card_name,
                immediate_reward_value=immediate_reward,
                fee_waiver_progress_impact=fee_waiver_impact,
                simplification_score=simplification_score,
                blended_total_value=blended_score,
                explanation=explanation,
                confidence_label="High",
                reward_type=r.evaluation.reward_type or "CASHBACK",
                cashback_amount=float(r.evaluation.cashback_amount) if r.evaluation.cashback_amount is not None else None,
                reward_points=float(r.evaluation.reward_points) if r.evaluation.reward_points is not None else None
            )
            ranked_cards.append(card)
            
        # 3. Sort by blended_total_value
        ranked_cards.sort(key=lambda x: x.blended_total_value, reverse=True)
        
        if ranked_cards:
            best_card = ranked_cards[0]
            best_card.explanation = TradeoffExplainer.explain(
                intent=intent,
                immediate_reward=best_card.immediate_reward_value,
                fee_waiver_impact=best_card.fee_waiver_progress_impact,
                is_best_overall=True
            )
            
        # Determine best cards per category (for the UI to show tradeoffs if needed)
        best_cashback = max(ranked_cards, key=lambda x: x.immediate_reward_value) if ranked_cards else None
        best_fee_waiver = max(ranked_cards, key=lambda x: x.fee_waiver_progress_impact) if ranked_cards else None
        
        balanced_cards = sorted(ranked_cards, key=lambda x: x.immediate_reward_value * 0.5 + x.fee_waiver_progress_impact * 0.5, reverse=True)
        best_balanced = balanced_cards[0] if balanced_cards else None
        
        simplify_cards = sorted(ranked_cards, key=lambda x: x.simplification_score, reverse=True)
        best_simplify = simplify_cards[0] if simplify_cards else None
        
        return OptimizationResponse(
            normalized_merchant=merchant.canonical_name,
            category=merchant.category,
            best_cashback_card=best_cashback,
            best_fee_waiver_card=best_fee_waiver,
            best_balanced_card=best_balanced,
            best_simplify_card=best_simplify,
            all_ranked_cards=ranked_cards
        )
