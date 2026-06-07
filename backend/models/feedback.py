import uuid
from datetime import datetime, timezone
from typing import Optional, Any, Dict
from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel

class Feedback(SQLModel, table=True):
    __tablename__ = "feedback"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    
    calculation_id: Optional[str] = Field(default=None, index=True)
    
    merchant_name: str
    transaction_amount: float
    card_id: uuid.UUID = Field(foreign_key="card_catalogs.id")
    calculated_reward: float
    
    rule_version: str
    issue_type: str
    issue_description: Optional[str] = Field(default=None)
    
    calculation_context: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONB))
    
    status: str = Field(default="open")  # open, investigating, resolved, rejected, duplicate
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
