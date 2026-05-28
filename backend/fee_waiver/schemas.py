from enum import Enum
from pydantic import BaseModel
from decimal import Decimal
from typing import Optional
from datetime import date
from uuid import UUID

class UrgencyLevel(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    ELEVATED = "ELEVATED"
    HIGH = "HIGH"

class ComfortState(str, Enum):
    SAFELY_ON_TRACK = "SAFELY_ON_TRACK"
    MONITOR_PROGRESS = "MONITOR_PROGRESS"
    REQUIRES_ATTENTION = "REQUIRES_ATTENTION"
    UNLIKELY_NATURALLY = "UNLIKELY_NATURALLY"

class FeeWaiverState(BaseModel):
    """
    Longitudinal fee waiver state representation for a given UserCard.
    """
    card_id: UUID
    annual_fee: Decimal
    effective_annual_fee: Decimal
    waiver_target: Optional[Decimal] = None
    current_cycle_spend: Decimal
    remaining_spend: Optional[Decimal] = None
    renewal_date: Optional[date] = None
    days_remaining: Optional[int] = None
    waiver_progress_percentage: Optional[float] = None
    
    # Intelligence Outputs
    projected_completion_probability: float
    waiver_value_at_risk: float
    urgency_level: Optional[UrgencyLevel] = None
    comfort_state: Optional[ComfortState] = None
    
    # Explanation
    explanation_text: str
    
    @property
    def is_achieved(self) -> bool:
        return self.remaining_spend is not None and self.remaining_spend <= 0
