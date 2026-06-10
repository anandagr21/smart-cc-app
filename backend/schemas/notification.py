"""
Module: backend.schemas.notification
Responsibility: Pydantic schemas for notifications API.
"""

from datetime import datetime
from typing import Optional, Any
from uuid import UUID

from pydantic import BaseModel, Field

from models.enums import NotificationType


class NotificationCreate(BaseModel):
    """Schema for creating a notification internally."""
    user_id: UUID
    type: NotificationType
    title: str = Field(..., max_length=255)
    body: str
    action_url: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    metadata_: Optional[dict[str, Any]] = Field(None, alias="metadata")

    class Config:
        populate_by_name = True


class NotificationRead(BaseModel):
    """Schema for returning a notification to the client."""
    id: UUID
    type: NotificationType
    title: str
    body: str
    is_read: bool
    action_url: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    metadata_: Optional[dict[str, Any]] = Field(None, alias="metadata")
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
        populate_by_name = True


class NotificationsListResponse(BaseModel):
    """Response schema containing notifications and unread count."""
    notifications: list[NotificationRead]
    unread_count: int
