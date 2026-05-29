import enum
from typing import Optional, List
from datetime import datetime, timezone
import uuid
from sqlmodel import Field, SQLModel, Column, JSON

class CardDocumentType(str, enum.Enum):
    REWARD_GUIDE = "REWARD_GUIDE"
    MITC = "MITC"
    FEES_AND_CHARGES = "FEES_AND_CHARGES"
    BENEFITS_GUIDE = "BENEFITS_GUIDE"
    EXCLUSIONS = "EXCLUSIONS"
    MILESTONE_RULES = "MILESTONE_RULES"
    OFFER_TERMS = "OFFER_TERMS"
    GENERAL_TERMS = "GENERAL_TERMS"

class DocumentProcessingStatus(str, enum.Enum):
    UPLOADED = "UPLOADED"
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class CardDocument(SQLModel, table=True):
    __tablename__ = "card_documents"  # type: ignore

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    card_id: uuid.UUID = Field(foreign_key="card_catalogs.id", index=True)
    document_type: CardDocumentType
    file_name: str
    storage_path: str
    mime_type: str = Field(default="application/pdf")
    
    uploaded_by: Optional[uuid.UUID] = Field(default=None, foreign_key="users.id")
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    processing_status: DocumentProcessingStatus = Field(default=DocumentProcessingStatus.UPLOADED)
    processing_started_at: Optional[datetime] = Field(default=None)
    processing_completed_at: Optional[datetime] = Field(default=None)
    processing_error: Optional[str] = Field(default=None)
    
    document_version: int = Field(default=1)
    checksum_hash: str

class DocumentIngestionJob(SQLModel, table=True):
    __tablename__ = "document_ingestion_jobs"  # type: ignore

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    document_id: uuid.UUID = Field(foreign_key="card_documents.id", index=True)
    
    status: DocumentProcessingStatus = Field(default=DocumentProcessingStatus.QUEUED)
    
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)
    
    pipeline_version: str = Field(default="v1.0.0")
    trigger_source: str = Field(default="manual")
    retry_count: int = Field(default=0)
    
    logs: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))
    triggered_by: Optional[uuid.UUID] = Field(default=None, foreign_key="users.id")
