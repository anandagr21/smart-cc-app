import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class FeedbackCreate(BaseModel):
    calculation_id: Optional[str] = None
    merchant_name: str
    transaction_amount: float
    card_id: uuid.UUID
    calculated_reward: float
    rule_version: str
    issue_type: str
    issue_description: Optional[str] = None
    calculation_context: Dict[str, Any] = Field(default_factory=dict)

class FeedbackResponse(FeedbackCreate):
    id: uuid.UUID
    user_id: uuid.UUID
    status: str
    priority: str
    created_at: datetime
