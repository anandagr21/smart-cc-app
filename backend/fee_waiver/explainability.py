from decimal import Decimal
from .schemas import ComfortState, UrgencyLevel

class WaiverExplainability:
    """
    Generates calm, informative editorial text based on the fee waiver state.
    """
    
    @staticmethod
    def generate_state_explanation(
        comfort_state: ComfortState,
        urgency: UrgencyLevel,
        is_achieved: bool,
        remaining_spend: Decimal,
        days_remaining: int
    ) -> str:
        if is_achieved:
            return "Annual fee waiver successfully achieved for this cycle."
            
        if comfort_state == ComfortState.SAFELY_ON_TRACK:
            return "At your current pace, this card is comfortably on track for waiver."
            
        if comfort_state == ComfortState.MONITOR_PROGRESS:
            return "Current spending pace is moderate; continued usage will help secure the waiver."
            
        if comfort_state == ComfortState.REQUIRES_ATTENTION:
            if urgency in (UrgencyLevel.HIGH, UrgencyLevel.ELEVATED):
                return "Strategic routing to this card will materially improve waiver likelihood."
            return "Current spending patterns may fall short of the waiver threshold."
            
        if comfort_state == ComfortState.UNLIKELY_NATURALLY:
            return "Current spending patterns may not naturally reach the waiver threshold before renewal."
            
        return "Fee waiver progress is being tracked."
        
    @staticmethod
    def generate_tradeoff_explanation(
        preserves_waiver: bool,
        milestone_acceleration: bool = False
    ) -> str:
        if preserves_waiver:
            return "Improves long-term portfolio value despite lower immediate rewards by preserving fee waiver."
        return ""
