from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlmodel.ext.asyncio.session import AsyncSession

from api.deps import get_user_card_repo
from auth.dependencies import get_current_user
from auth.schemas import UserResponse
from core.database import get_db
from merchants.repository import AliasRepository, MerchantRepository
from merchants.service import MerchantService
from recommendations.orchestrator import RecommendationOrchestrator
from recommendations.service import RecommendationService
from repositories.card_repository import UserCardRepository
from rewards.service import RewardRuleService
from services.card_service import UserCardService
from transactions.repository import TransactionRepository
from transactions.service import TransactionService

from monthly_intelligence.analytics.behavior_analytics import BehaviorAnalyticsEngine
from monthly_intelligence.forecasting.optimization_forecasting import OptimizationForecastingEngine
from monthly_intelligence.narratives.monthly_narrative import MonthlyNarrativeGenerator
from monthly_intelligence.orchestrator import MonthlyIntelligenceOrchestrator
from monthly_intelligence.schemas import MonthlySummaryResponse
from monthly_intelligence.scoring.behavior_streak import BehaviorStreakService
from monthly_intelligence.suppression.novelty_scoring import NoveltyScoringEngine
from monthly_intelligence.trend_detection.trend_service import TrendDetectionService


router = APIRouter(prefix="/monthly-intelligence", tags=["monthly-intelligence"])


def get_monthly_orchestrator(
    db: AsyncSession = Depends(get_db),
    user_card_repo: UserCardRepository = Depends(get_user_card_repo),
) -> MonthlyIntelligenceOrchestrator:
    # 1. Base dependencies
    merchant_repo = MerchantRepository(session=db)
    alias_repo = AliasRepository(session=db)
    merchant_service = MerchantService(merchant_repo, alias_repo)
    
    card_service = UserCardService(user_card_repo=user_card_repo)
    tx_repo = TransactionRepository(session=db)
    tx_service = TransactionService(tx_repo, merchant_service)
    
    # 2. Recommendation dependencies for Analytics
    reward_rule_service = RewardRuleService(session=db)
    rec_orch = RecommendationOrchestrator(merchant_service, card_service, reward_rule_service)
    rec_service = RecommendationService(rec_orch, session=db)
    
    # 3. Monthly Engines
    analytics_engine = BehaviorAnalyticsEngine(rec_service)
    trend_service = TrendDetectionService()
    forecasting_engine = OptimizationForecastingEngine(spend_aggregator=None) # No spend_aggregator for now
    streak_service = BehaviorStreakService()
    narrative_generator = MonthlyNarrativeGenerator()
    novelty_engine = NoveltyScoringEngine(db)
    
    return MonthlyIntelligenceOrchestrator(
        analytics_engine=analytics_engine,
        trend_service=trend_service,
        forecasting_engine=forecasting_engine,
        streak_service=streak_service,
        narrative_generator=narrative_generator,
        novelty_engine=novelty_engine,
        transaction_service=tx_service,
        card_service=card_service
    )


@router.get("/", response_model=MonthlySummaryResponse)
async def get_monthly_summary(
    year: Optional[int] = Query(None, description="Target year, defaults to current year"),
    month: Optional[int] = Query(None, description="Target month, defaults to current month"),
    current_user: UserResponse = Depends(get_current_user),
    orchestrator: MonthlyIntelligenceOrchestrator = Depends(get_monthly_orchestrator)
):
    """
    Fetch the deterministic, behavior-aware longitudinal insights for a specific month.
    Defaults to the current month if not specified.
    """
    today = date.today()
    target_year = year or today.year
    target_month = month or today.month
    
    return await orchestrator.generate_monthly_summary(current_user.id, target_year, target_month)
