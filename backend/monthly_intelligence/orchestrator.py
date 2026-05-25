import calendar
from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from monthly_intelligence.analytics.behavior_analytics import BehaviorAnalyticsEngine
from monthly_intelligence.forecasting.optimization_forecasting import OptimizationForecastingEngine
from monthly_intelligence.narratives.monthly_narrative import MonthlyNarrativeGenerator
from monthly_intelligence.schemas import MonthlySummaryResponse
from monthly_intelligence.scoring.behavior_streak import BehaviorStreakService
from monthly_intelligence.suppression.novelty_scoring import NoveltyScoringEngine
from monthly_intelligence.trend_detection.trend_service import TrendDetectionService

from services.card_service import UserCardService
from transactions.service import TransactionService


class MonthlyIntelligenceOrchestrator:
    """
    Coordinates longitudinal analytics, trend detection, forecasting,
    and narrative generation to build the month-over-month intelligence summary.
    """

    def __init__(
        self,
        analytics_engine: BehaviorAnalyticsEngine,
        trend_service: TrendDetectionService,
        forecasting_engine: OptimizationForecastingEngine,
        streak_service: BehaviorStreakService,
        narrative_generator: MonthlyNarrativeGenerator,
        novelty_engine: NoveltyScoringEngine,
        transaction_service: TransactionService,
        card_service: UserCardService,
    ):
        self.analytics_engine = analytics_engine
        self.trend_service = trend_service
        self.forecasting_engine = forecasting_engine
        self.streak_service = streak_service
        self.narrative_generator = narrative_generator
        self.novelty_engine = novelty_engine
        self.transaction_service = transaction_service
        self.card_service = card_service

    async def generate_monthly_summary(
        self, user_id: UUID, target_year: int, target_month: int
    ) -> MonthlySummaryResponse:
        
        # 1. Date ranges for current and previous month
        curr_start = date(target_year, target_month, 1)
        _, last_day = calendar.monthrange(target_year, target_month)
        curr_end = date(target_year, target_month, last_day)
        
        prev_month = target_month - 1 if target_month > 1 else 12
        prev_year = target_year if target_month > 1 else target_year - 1
        prev_start = date(prev_year, prev_month, 1)
        _, prev_last_day = calendar.monthrange(prev_year, prev_month)
        prev_end = date(prev_year, prev_month, prev_last_day)
        
        period_str = f"{target_year}-{target_month:02d}"

        # 2. Fetch raw state
        cards = await self.card_service.fetch_raw_cards(user_id, skip=0, limit=100)
        curr_txns = await self.transaction_service.fetch_raw_transactions_by_date(user_id, curr_start, curr_end)
        prev_txns = await self.transaction_service.fetch_raw_transactions_by_date(user_id, prev_start, prev_end)
        
        # 3. Analytics (MoM metrics)
        curr_metrics = await self.analytics_engine.compute_monthly_metrics(user_id, curr_txns, cards)
        prev_metrics = await self.analytics_engine.compute_monthly_metrics(user_id, prev_txns, cards)
        
        # 4. Detect Trends
        trends = self.trend_service.detect_trends(curr_metrics, prev_metrics)
        
        # 5. Streaks
        streaks = self.streak_service.detect_streaks(user_id, curr_txns, curr_metrics)
        
        # 6. Forecasting
        forecasts = await self.forecasting_engine.generate_forecasts(user_id, cards, curr_metrics)
        
        # 7. Generate Narratives
        narratives = self.narrative_generator.generate_narratives(trends, curr_metrics)
        
        # 8. Filter repetitive narratives
        filtered_narratives = await self.novelty_engine.filter_narratives(user_id, narratives, period_str)
        
        # 9. Mark narratives as shown (for future fatigue suppression)
        # In a real system, you might only mark them shown if the user actually sees them,
        # but for V1 we can assume fetch == shown.
        await self.novelty_engine.mark_narratives_shown(user_id, filtered_narratives, period_str)
        
        opt_rate = curr_metrics.get("optimization_rate", 0)
        prev_opt_rate = prev_metrics.get("optimization_rate", 0)
        
        return MonthlySummaryResponse(
            period=period_str,
            total_rewards_optimized=curr_metrics.get("total_rewards_optimized", 0.0),
            missed_opportunity_value=curr_metrics.get("missed_opportunity_value", 0.0),
            optimization_rate=opt_rate,
            strongest_category=curr_metrics.get("strongest_category"),
            strongest_card=curr_metrics.get("strongest_card"),
            improvement_delta=opt_rate - prev_opt_rate,
            streaks=streaks,
            narratives=filtered_narratives,
            forecasts=forecasts,
            supporting_metrics=curr_metrics
        )
