import json
from uuid import UUID
from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi import Request
from models.audit_log import AuditLog

class AuditService:
    @staticmethod
    async def log_action(
        db: AsyncSession,
        user_id: UUID,
        action: str,
        resource_type: str,
        resource_id: str,
        details: dict,
        request: Request = None
    ) -> None:
        ip_address = None
        user_agent = None
        
        if request:
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent")
            
        log_entry = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=json.dumps(details),
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        db.add(log_entry)
        # We don't commit here to allow it to be part of the caller's transaction
