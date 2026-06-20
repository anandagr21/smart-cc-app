import uuid
from datetime import datetime, timezone
from sqlmodel import Field, SQLModel

class WaitlistEntry(SQLModel, table=True):
    __tablename__ = "waitlist_entries"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    email: str = Field(unique=True, index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
