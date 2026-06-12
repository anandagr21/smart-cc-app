import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Column, String, Index, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlmodel import Field, SQLModel

class SearchSession(SQLModel, table=True):
    __tablename__ = "search_sessions"
    __table_args__ = (
        Index("ix_search_sessions_intent_type", "intent_type"),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    )
    raw_query: str = Field(nullable=False)
    resolved_query: Optional[str] = Field(default=None)
    intent_type: str = Field(default="UNKNOWN", nullable=False)
    entity_type: Optional[str] = Field(default=None)
    entity_id: Optional[uuid.UUID] = Field(
        default=None,
        sa_column=Column(PG_UUID(as_uuid=True), nullable=True)
    )
    resolution_type: str = Field(default="UNKNOWN", nullable=False)
    confidence: float = Field(default=0.0, nullable=False)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        nullable=False,
    )


class SearchEvent(SQLModel, table=True):
    __tablename__ = "search_events"
    __table_args__ = (
        Index("ix_search_events_session_id", "session_id"),
        Index("ix_search_events_type", "event_type"),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    )
    session_id: Optional[uuid.UUID] = Field(
        default=None,
        sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("search_sessions.id", ondelete="CASCADE"), nullable=True)
    )
    event_type: str = Field(nullable=False)
    payload: Optional[dict] = Field(
        default=None,
        sa_column=Column(JSONB, nullable=True)
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        nullable=False,
    )


class SearchCache(SQLModel, table=True):
    __tablename__ = "search_cache"
    __table_args__ = (
        Index("ix_search_cache_expires", "expires_at"),
    )

    query_hash: str = Field(sa_column=Column(String, primary_key=True))
    resolved_intent: dict = Field(sa_column=Column(JSONB, nullable=False))
    expires_at: datetime = Field(nullable=False)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        nullable=False,
    )
