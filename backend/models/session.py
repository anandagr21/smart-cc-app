"""
Module: backend.models.session
Responsibility: Database entity for user sessions (1:1 with refresh token_family).

Ponytail: Postgres-only, no Redis. O(50 users) trivial scan. Upgrade to Redis TTL only at 10k DAU.
Each login creates one Session row; refresh rotates jti but touches last_active_at; logout/reuse revokes.
"""

from datetime import datetime
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class Session(SQLModel, table=True):
    """User session bound to a refresh token_family.

    One session per login (token_family). Allows per-device revoke and
    last_active tracking for retention analytics without a separate store.
    """

    __tablename__ = "sessions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    token_family: str = Field(index=True, unique=True, max_length=64)
    ip_address: str | None = Field(default=None, max_length=45)
    device_label: str | None = Field(default=None, max_length=100)  # ponytail: "Android 14" / "iOS 18.1" / "Web • Chrome"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_active_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    expires_at: datetime = Field()
    revoked_at: datetime | None = Field(default=None)
    is_revoked: bool = Field(default=False)
