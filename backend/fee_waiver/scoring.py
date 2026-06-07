from decimal import Decimal
from .schemas import UrgencyLevel, ComfortState

class WaiverScoring:
    """
    Scoring engine to determine portfolio-level value-at-risk and urgency.
    """
    
    @staticmethod
    def compute_value_at_risk(
        effective_annual_fee: Decimal,
        completion_probability: float,
        is_achieved: bool
    ) -> float:
        """
        Computes the expected value lost if the waiver isn't hit.
        If already achieved, risk is 0.
        Otherwise, risk = fee * (1 - probability).
        """
        if is_achieved or effective_annual_fee <= 0:
            return 0.0
            
        return round(float(effective_annual_fee) * (1.0 - completion_probability), 2)
        
    @staticmethod
    def determine_comfort_state(
        completion_probability: float,
        is_achieved: bool
    ) -> ComfortState:
        """
        Maps probability to a calm editorial state.
        """
        if is_achieved:
            return ComfortState.SAFELY_ON_TRACK
            
        if completion_probability >= 0.75:
            return ComfortState.SAFELY_ON_TRACK
        elif completion_probability >= 0.4:
            return ComfortState.MONITOR_PROGRESS
        elif completion_probability >= 0.1:
            return ComfortState.REQUIRES_ATTENTION
            
        return ComfortState.UNLIKELY_NATURALLY
        
    @staticmethod
    def determine_urgency(
        days_remaining: int,
        remaining_spend: Decimal,
        completion_probability: float,
        is_achieved: bool
    ) -> UrgencyLevel:
        """
        Determines how urgent it is to route spend to this card.
        """
        if is_achieved or remaining_spend <= 0:
            return UrgencyLevel.LOW
            
        if days_remaining > 180:
            return UrgencyLevel.LOW
            
        if days_remaining <= 30 and completion_probability < 1.0:
            # If it's still possible to reach
            if remaining_spend < 50000:
                return UrgencyLevel.HIGH
            return UrgencyLevel.LOW # Abandoned cause
            
        if days_remaining <= 90:
            if completion_probability < 0.6:
                return UrgencyLevel.ELEVATED
            return UrgencyLevel.MODERATE
            
        return UrgencyLevel.LOW
