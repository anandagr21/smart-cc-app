from datetime import datetime
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel

class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_logs"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    action: str = Field(index=True)
    resource_type: str = Field(index=True)
    resource_id: str = Field(index=True)
    details: str
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
