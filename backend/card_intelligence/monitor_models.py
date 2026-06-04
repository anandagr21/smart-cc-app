from sqlmodel import SQLModel, Field, Column
from sqlalchemy import String, DateTime, func, Text
from datetime import datetime
from uuid import UUID

class CardMonitoring(SQLModel, table=True):
    __tablename__ = "card_monitoring"
    
    card_id: UUID = Field(primary_key=True, foreign_key="card_catalogs.id", description="Foreign key to CardCatalog.id")
    card_url: str = Field(sa_column=Column(Text, nullable=False))
    last_seen_hash: str = Field(sa_column=Column(String(32), nullable=False))
    stored_text: str = Field(sa_column=Column(Text, nullable=False))
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), onupdate=func.now())
    )
