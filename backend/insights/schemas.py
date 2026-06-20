import uuid
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class InsightPriority(str, Enum):
    URGENT = "URGENT"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    INFORMATIONAL = "INFORMATIONAL"


class InsightCategory(str, Enum):
    FEE_WAIVER = "FEE_WAIVER"
    MISSED_REWARDS = "MISSED_REWARDS"
    UNDERUTILIZED_CARD = "UNDERUTILIZED_CARD"
    PORTFOLIO_OPTIMIZATION = "PORTFOLIO_OPTIMIZATION"


class ConfidenceLevel(str, Enum):
    HIGH = "HIGH"
    MODERATE = "MODERATE"
    ESTIMATED = "ESTIMATED"


class InsightResponse(BaseModel):
    id: str = Field(..., description="Unique identifier for the insight")
    category: InsightCategory
    priority: InsightPriority
    confidence: ConfidenceLevel

    title: str = Field(..., description="Short, punchy title")
    summary: str = Field(..., description="1-2 sentence descriptive summary")
    reasoning: str = Field(..., description="Deterministic explanation of WHY this insight exists")

    # E.g., 'NEAR WAIVER', 'TRAVEL PICK'
    badge_label: str = Field(..., description="Short tag for UI featured cards")
    badge_color: str = Field(..., description="Hex color code for the badge")

    # If the insight targets a specific card
    related_card_id: str | None = Field(None, description="UUID of the related UserCard")

    # Financial impact
    monetary_value: float | None = Field(None, description="Monetary delta or target amount")

    # Actionable payload
    recommended_action: dict[str, Any] | None = Field(
        None, description="Structured action (e.g. deep link, payload)"
    )

    # Traceability
    source_transactions: list[str] = Field(
        default_factory=list, description="List of transaction IDs that triggered this"
    )

    # Suppression & Priority scoring metadata
    actionability_score: int = Field(..., description="0-100 score of how actionable this is")
    insight_hash: str = Field(..., description="Deterministic hash of the insight content")
    cooldown_period_hours: int = Field(default=24, description="How long to suppress after showing")

    generated_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime | None = Field(None)
