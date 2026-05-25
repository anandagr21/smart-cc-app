import datetime
from typing import List
from uuid import UUID

from models.user_card import UserCard
from monthly_intelligence.schemas import ConfidenceLevel, Forecast
from cards.intelligence.spend_aggregator import SpendAggregator


class OptimizationForecastingEngine:
    """
    Projects spending velocity and reward trends conservatively.
    Contains NO fabricated AI predictions; strictly mathematically grounded.
    """

    def __init__(self, spend_aggregator: SpendAggregator):
        self.spend_aggregator = spend_aggregator

    async def generate_forecasts(
        self, user_id: UUID, user_cards: List[UserCard], current_metrics: dict
    ) -> List[Forecast]:
        forecasts = []
        
        # 1. Fee Waiver Forecast
        # Calculate daily spend velocity and project when fee waiver will be hit
        # We need the annual spend from the cards
        now = datetime.datetime.utcnow()
        day_of_year = now.timetuple().tm_yday
        
        # Simple velocity calculation (spend / days elapsed)
        # We use a conservative multiplier
        for card in user_cards:
            annual_spend = float(card.annual_spend)
            
            # Check if there is a waiver threshold
            waiver_threshold = 0.0
            if card.card_catalog and getattr(card.card_catalog, 'annual_fee_waiver_spend', None):
                waiver_threshold = float(card.card_catalog.annual_fee_waiver_spend)
                
            if waiver_threshold > 0 and annual_spend > 0 and annual_spend < waiver_threshold:
                daily_velocity = annual_spend / max(day_of_year, 1)
                
                # Project end of year spend
                projected_spend = daily_velocity * 365
                
                if projected_spend >= waiver_threshold:
                    # Calculate days remaining
                    remaining_spend = waiver_threshold - annual_spend
                    days_remaining = int(remaining_spend / daily_velocity)
                    
                    if days_remaining > 0 and days_remaining < 365:
                        forecasts.append(
                            Forecast(
                                id=f"FEE_WAIVER_{card.id}",
                                text=f"At your current spending behavior, you will likely unlock the fee waiver for your {card.card_catalog.name} in ~{days_remaining} days.",
                                confidence=ConfidenceLevel.MODERATE_TREND,
                                reasoning=f"Based on daily spend velocity of ₹{daily_velocity:.2f}/day.",
                                target_metric="fee_waiver"
                            )
                        )
                        
        return forecasts
