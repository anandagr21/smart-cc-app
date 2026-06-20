from uuid import UUID
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from fastapi import HTTPException
from models.notification import Notification

class NotificationService:
    @staticmethod
    async def list_notifications(session: AsyncSession, user_id: UUID) -> tuple[list[Notification], int]:
        stmt = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
        )
        result = await session.execute(stmt)
        notifications = result.scalars().all()
        
        unread_count = sum(1 for n in notifications if not n.is_read)
        
        return notifications, unread_count

    @staticmethod
    async def mark_notification_read(session: AsyncSession, notification_id: UUID, user_id: UUID) -> None:
        notification = await session.get(Notification, notification_id)
        
        if not notification or notification.user_id != user_id:
            raise HTTPException(status_code=404, detail="Notification not found")
            
        notification.is_read = True
        session.add(notification)
        await session.commit()

    @staticmethod
    async def mark_all_notifications_read(session: AsyncSession, user_id: UUID) -> None:
        stmt = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .where(Notification.is_read == False)
        )
        result = await session.execute(stmt)
        unread_notifications = result.scalars().all()
        
        for notification in unread_notifications:
            notification.is_read = True
            session.add(notification)
            
        await session.commit()
