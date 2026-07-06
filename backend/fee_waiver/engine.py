from datetime import date
from typing import Any
from decimal import Decimal

from models.user_card import UserCard
from .schemas import FeeWaiverState
from .projections import WaiverProjections
from .scoring import WaiverScoring
from .explainability import WaiverExplainability

class FeeWaiverEngine:
    
    @staticmethod
    def evaluate(user_card: Any) -> FeeWaiverState | None:
        """
        Synthesizes the deterministic fee waiver state for a card.
        """
        # Handle both ORM UserCard and UserCardResponse schema
        if hasattr(user_card, "card_catalog") and user_card.card_catalog:
            annual_fee = getattr(user_card.card_catalog, "annual_fee", Decimal("0.00"))
        elif hasattr(user_card, "card_details") and user_card.card_details:
            annual_fee = getattr(user_card.card_details, "annual_fee", Decimal("0.00"))
        else:
            annual_fee = Decimal("0.00")
        effective_annual_fee = user_card.effective_annual_fee
        
        if effective_annual_fee <= 0:
            return None # No fee at risk
            
        waiver_target = getattr(user_card, "effective_fee_waiver_threshold", None)
        
        if not waiver_target or waiver_target <= 0:
            return None # No waiver possible
            
        current_spend = getattr(user_card, "annual_spend", Decimal("0.00"))
        remaining_spend = getattr(user_card, "remaining_waiver_spend", getattr(user_card, "remaining_spend_for_waiver", None))
        days_remaining = getattr(user_card, "days_until_fee_debit", getattr(user_card, "days_until_renewal", None))
        progress = getattr(user_card, "waiver_progress_percentage", getattr(user_card, "fee_waiver_progress_percent", None))
        
        is_achieved = remaining_spend is not None and remaining_spend <= 0
        
        # Calculate days elapsed (365 - days_remaining approx)
        days_elapsed = getattr(user_card, "fee_cycle_elapsed_days", None)
        if days_elapsed is None and days_remaining is not None:
            days_elapsed = max(1, 365 - days_remaining)
        elif days_elapsed is None:
            days_elapsed = 0
            
        # 1. Projections
        probability = WaiverProjections.project_completion_probability(
            current_spend=current_spend,
            waiver_target=waiver_target,
            days_elapsed=days_elapsed,
            days_remaining=days_remaining or 0
        )
        
        # 2. Scoring
        value_at_risk = WaiverScoring.compute_value_at_risk(
            effective_annual_fee=effective_annual_fee,
            completion_probability=probability,
            is_achieved=is_achieved
        )
        
        comfort_state = WaiverScoring.determine_comfort_state(
            completion_probability=probability,
            is_achieved=is_achieved
        )
        
        urgency = WaiverScoring.determine_urgency(
            days_remaining=days_remaining or 0,
            remaining_spend=remaining_spend or Decimal("0.00"),
            completion_probability=probability,
            is_achieved=is_achieved
        )
        
        # 3. Explainability
        has_history = current_spend > Decimal("0")
        explanation = WaiverExplainability.generate_state_explanation(
            comfort_state=comfort_state,
            urgency=urgency,
            is_achieved=is_achieved,
            remaining_spend=remaining_spend or Decimal("0.00"),
            days_remaining=days_remaining or 0,
            has_spending_history=has_history,
        )
        
        return FeeWaiverState(
            card_id=user_card.id,
            annual_fee=annual_fee,
            effective_annual_fee=effective_annual_fee,
            waiver_target=waiver_target,
            current_cycle_spend=current_spend,
            remaining_spend=remaining_spend,
            renewal_date=None, # We don't need actual date right now if we have days_remaining
            days_remaining=days_remaining,
            waiver_progress_percentage=progress,
            projected_completion_probability=probability,
            waiver_value_at_risk=value_at_risk,
            urgency_level=urgency,
            comfort_state=comfort_state,
            explanation_text=explanation
        )
