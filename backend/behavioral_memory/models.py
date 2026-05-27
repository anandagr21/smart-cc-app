from datetime import datetime
from decimal import Decimal
from typing import Optional
from enum import Enum
import uuid

from sqlmodel import Field, SQLModel
from cards.enums import OptimizationPersonality

class OverrideReason(str, Enum):
    """
    Lightweight, financially-grounded reasons for overriding a recommendation.
    """
    PERSONAL_PREFERENCE = "Personal preference"
    BUILDING_MILESTONE = "Building milestone"
    SIMPLIFYING_WALLET = "Simplifying wallet"
    TEMPORARY_CHOICE = "Temporary choice"
    AVOIDING_ANNUAL_FEE = "Avoiding annual fee"


class RecommendationBehaviorRecord(SQLModel, table=True):
    """
    Longitudinal behavioral memory of transaction recommendations.
    Tracks whether the user followed the recommendation, and captures overrides.
    """
    __tablename__ = "recommendation_behavior_records"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    transaction_id: uuid.UUID = Field(foreign_key="transactions.id", unique=True, index=True)
    
    recommended_card_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user_cards.id")
    selected_card_id: uuid.UUID = Field(foreign_key="user_cards.id")
    
    # State of the user's strategic focus AT THE TIME of this transaction
    personality_at_time: OptimizationPersonality
    
    was_followed: bool = Field(default=True)
    
    # Financial magnitude of the override (how much value was lost/gained by overriding)
    override_delta_value: Optional[Decimal] = Field(default=None)
    
    # Soft context provided by the user (if any)
    override_reason: Optional[OverrideReason] = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow)
