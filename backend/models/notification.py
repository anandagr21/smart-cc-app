"""
Module: backend.models.notification
Responsibility: Defines the database entity for a Notification.
"""

from datetime import datetime
from typing import Optional, TYPE_CHECKING
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel, AutoString
from sqlalchemy.dialects.postgresql import JSONB

from .enums import NotificationType

if TYPE_CHECKING:
    from models.user import User


class Notification(SQLModel, table=True):
    """Notification entity stored in the 'notifications' table."""

    __tablename__ = "notifications"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    
    type: NotificationType = Field(sa_type=AutoString)
    title: str = Field(max_length=255)
    body: str
    
    is_read: bool = Field(default=False)
    
    # Deep linking properties
    action_url: Optional[str] = Field(default=None)
    entity_type: Optional[str] = Field(default=None, max_length=100)
    entity_id: Optional[str] = Field(default=None, max_length=100)
    
    # Arbitrary context for future extensibility
    metadata_: Optional[dict] = Field(default=None, sa_type=JSONB, sa_column_kwargs={"name": "metadata"})
    
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        index=True
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )

    # ---- Relationships ----
    # (Assuming we might want to relate back to User, though often just querying by user_id is enough)
    # user: "User" = Relationship(back_populates="notifications")
