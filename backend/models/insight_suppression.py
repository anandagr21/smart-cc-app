import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class InsightSuppression(SQLModel, table=True):
    __tablename__ = "insight_suppressions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    
    # E.g., 'FEE_WAIVER', 'MISSED_REWARDS'
    insight_category: str = Field(index=True)
    
    # Hash representing semantically unique insight (e.g. 'FEE_WAIVER_card_123')
    insight_hash: str = Field(index=True)
    
    # Scope of the suppression (e.g., 'GENERAL', 'MONTHLY')
    scope: str = Field(default="GENERAL", index=True)
    
    # Grouping for novelty suppression (e.g., 'DINING_OPTIMIZATION_IMPROVED')
    novelty_group: Optional[str] = Field(default=None, index=True)
    
    # The period this suppression applies to (e.g., '2026-05')
    period: Optional[str] = Field(default=None, index=True)
    
    # Track the last time this specific insight was surfaced to the user
    last_shown_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Whether the user explicitly dismissed this insight
    is_dismissed: bool = Field(default=False)
    
    # When this suppression expires, allowing the insight to be shown again
    cooldown_expires_at: Optional[datetime] = Field(default=None)
    
    # Optional metadata or reason for suppression (e.g., 'user_dismissed', 'cooldown')
    suppression_reason: Optional[str] = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )
