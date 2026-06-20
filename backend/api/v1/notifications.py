from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlmodel.ext.asyncio.session import AsyncSession

from auth.dependencies import get_current_user
from auth.schemas import UserResponse
from core.database import get_db
from schemas.notification import NotificationsListResponse
from services.notification_service import NotificationService

router = APIRouter()


@router.get("/", response_model=NotificationsListResponse)
async def list_notifications(
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
) -> dict:
    """Get all notifications for the current user and an unread count."""
    notifications, unread_count = await NotificationService.list_notifications(
        session, current_user.id
    )
    return {"notifications": notifications, "unread_count": unread_count}


@router.post("/{notification_id}/read", status_code=status.HTTP_200_OK)
async def mark_notification_read(
    notification_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
) -> dict:
    """Mark a specific notification as read."""
    await NotificationService.mark_notification_read(
        session, notification_id, current_user.id
    )
    return {"status": "success"}


@router.post("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_notifications_read(
    session: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
) -> dict:
    """Mark all notifications as read for the current user."""
    await NotificationService.mark_all_notifications_read(session, current_user.id)
    return {"status": "success"}
