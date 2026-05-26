import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field as PydanticField
from sqlmodel import Field, SQLModel, JSON, Column


class UserBehavioralProfile(SQLModel, table=True):
    """
    Longitudinal state of the user's optimization behaviors, slowly evolving over time.
    Used to inform coaching effectiveness, prioritization, and tone.
    """
    __tablename__ = "user_behavioral_profiles"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, unique=True)
    
    # Soft optimization archetypes (e.g., ["CASHBACK_FOCUSED", "SIMPLICITY"])
    archetypes: List[str] = Field(default=[], sa_column=Column(JSON))
    
    # Categories where the user is actively improving (e.g., ["DINING", "GROCERIES"])
    improving_categories: List[str] = Field(default=[], sa_column=Column(JSON))
    
    # Categories where the user repeatedly ignores insights
    stagnant_categories: List[str] = Field(default=[], sa_column=Column(JSON))
    
    # Mapping of card_id to adoption rate (float)
    card_adoption_rates: Dict[str, float] = Field(default={}, sa_column=Column(JSON))
    
    # Internal coaching effectiveness score (0-100)
    overall_coachability_score: float = Field(default=50.0)
    
    # When this profile was last calibrated by the BehavioralMemoryService
    last_calibrated_at: datetime = Field(default_factory=datetime.utcnow)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )
