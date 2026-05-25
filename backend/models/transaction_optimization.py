import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlmodel import Field, SQLModel


class TransactionOptimizationRecord(SQLModel, table=True):
    """
    Longitudinal record of how a transaction was optimized at the time it occurred.
    Useful for backend trend detection, analytics, and reward efficiency metrics.
    """
    __tablename__ = "transaction_optimization_records"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    
    # Relationships
    transaction_id: uuid.UUID = Field(foreign_key="transactions.id", index=True, unique=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    
    # What card was actually used
    actual_card_id: Optional[uuid.UUID] = Field(foreign_key="user_cards.id", default=None)
    
    # What card was recommended by the engine
    recommended_card_id: Optional[uuid.UUID] = Field(foreign_key="user_cards.id", default=None)
    
    # Financial impact of the optimization
    estimated_reward_delta: Decimal = Field(default=0, max_digits=12, decimal_places=2)
    
    # Confidence in this specific optimization (0-100)
    confidence_score: int = Field(default=0)
    
    # Timing
    recommendation_timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )
