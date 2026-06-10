from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from core.database import get_db
from api.v1.auth import get_current_user
from models.user import User
from models.notification import Notification
from schemas.notification import NotificationsListResponse

router = APIRouter()


@router.get("/", response_model=NotificationsListResponse)
async def list_notifications(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Get all notifications for the current user and an unread count."""
    
    # Query all notifications for user, ordered by newest first
    stmt = (
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
    )
    result = await session.execute(stmt)
    notifications = result.scalars().all()
    
    unread_count = sum(1 for n in notifications if not n.is_read)
    
    return {
        "notifications": notifications,
        "unread_count": unread_count
    }


@router.post("/{notification_id}/read", status_code=status.HTTP_200_OK)
async def mark_notification_read(
    notification_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Mark a specific notification as read."""
    
    notification = await session.get(Notification, notification_id)
    
    if not notification or notification.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notification.is_read = True
    session.add(notification)
    await session.commit()
    
    return {"status": "success"}


@router.post("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_notifications_read(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Mark all notifications as read for the current user."""
    
    stmt = (
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .where(Notification.is_read == False)
    )
    result = await session.execute(stmt)
    unread_notifications = result.scalars().all()
    
    for notification in unread_notifications:
        notification.is_read = True
        session.add(notification)
        
    await session.commit()
    
    return {"status": "success"}
