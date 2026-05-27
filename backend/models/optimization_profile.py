import uuid
from datetime import datetime
from sqlmodel import Field, SQLModel
from cards.enums import OptimizationPersonality

class OptimizationPersonalityProfile(SQLModel, table=True):
    """
    Tracks the user's strategic financial philosophy.
    This acts as a portfolio lens that shifts recommendation scoring and coaching behavior.
    """
    __tablename__ = "optimization_personality_profiles"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, unique=True)
    
    # The current strategic focus mode
    active_personality: OptimizationPersonality = Field(
        default=OptimizationPersonality.BALANCED_INTELLIGENCE
    )
    
    # Tracks if the system inferred this (True) or user manually selected it (False)
    is_inferred: bool = Field(default=False)

    # System confidence in the inferred personality (0.0 to 1.0)
    confidence_score: float = Field(default=1.0)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow, 
        sa_column_kwargs={"onupdate": datetime.utcnow}
    )
