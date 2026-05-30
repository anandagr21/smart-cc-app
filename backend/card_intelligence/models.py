import enum
from typing import Optional, List
from datetime import datetime, timezone
import uuid
from sqlmodel import Field, SQLModel, Column, JSON
from sqlalchemy import Text

class KnowledgeSourceType(str, enum.Enum):
    PDF = "PDF"
    URL = "URL"
    HTML = "HTML"

class ProcessingStatus(str, enum.Enum):
    DISCOVERED = "DISCOVERED"
    IMPORTED = "IMPORTED"
    UPLOADED = "UPLOADED"
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class CandidateStatus(str, enum.Enum):
    PENDING_REVIEW = "PENDING_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    PUBLISHED = "PUBLISHED"

class CandidateType(str, enum.Enum):
    CARD_FIELD = "CARD_FIELD"
    REWARD_RULE = "REWARD_RULE"
    FEE_RULE = "FEE_RULE"
    BENEFIT = "BENEFIT"
    EXCLUSION = "EXCLUSION"
    MILESTONE = "MILESTONE"
    OFFER = "OFFER"

class CardKnowledgeSource(SQLModel, table=True):
    __tablename__ = "card_knowledge_sources"  # type: ignore

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    card_id: uuid.UUID = Field(foreign_key="card_catalogs.id", index=True)
    
    source_type: KnowledgeSourceType = Field(default=KnowledgeSourceType.PDF)
    source_url: Optional[str] = Field(default=None)
    source_title: Optional[str] = Field(default=None)
    
    file_name: Optional[str] = Field(default=None)
    storage_path: Optional[str] = Field(default=None)
    mime_type: str = Field(default="application/pdf")
    
    uploaded_by: Optional[uuid.UUID] = Field(default=None, foreign_key="users.id")
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    
    processing_status: ProcessingStatus = Field(default=ProcessingStatus.UPLOADED)
    processing_started_at: Optional[datetime] = Field(default=None)
    processing_completed_at: Optional[datetime] = Field(default=None)
    processing_error: Optional[str] = Field(default=None)
    
    document_version: int = Field(default=1)
    checksum_hash: Optional[str] = Field(default=None)

class KnowledgeIngestionJob(SQLModel, table=True):
    __tablename__ = "knowledge_ingestion_jobs"  # type: ignore

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    knowledge_source_id: uuid.UUID = Field(foreign_key="card_knowledge_sources.id", index=True)
    
    status: ProcessingStatus = Field(default=ProcessingStatus.QUEUED)
    
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)
    
    pipeline_version: str = Field(default="v1.0.0")
    trigger_source: str = Field(default="manual")
    retry_count: int = Field(default=0)
    
    logs: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))
    triggered_by: Optional[uuid.UUID] = Field(default=None, foreign_key="users.id")

class ExtractionSnapshot(SQLModel, table=True):
    __tablename__ = "extraction_snapshots"  # type: ignore

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    card_id: uuid.UUID = Field(foreign_key="card_catalogs.id", index=True)
    source_id: uuid.UUID = Field(foreign_key="card_knowledge_sources.id", index=True)
    
    target_card_id: Optional[uuid.UUID] = Field(default=None, foreign_key="card_catalogs.id")
    target_card_name: Optional[str] = Field(default=None, max_length=255)
    
    raw_extracted_json: dict = Field(default_factory=dict, sa_column=Column(JSON))
    raw_llm_response: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    model_name: str = Field(max_length=255)
    prompt_version: str = Field(max_length=255)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SourceTextArtifact(SQLModel, table=True):
    __tablename__ = "source_text_artifacts"  # type: ignore

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    source_id: uuid.UUID = Field(foreign_key="card_knowledge_sources.id", index=True)
    
    raw_text: str = Field(sa_column=Column(Text))
    
    page_count: int = Field(default=1)
    word_count: int = Field(default=0)
    
    extracted_at: datetime = Field(default_factory=datetime.utcnow)

class ExtractionRun(SQLModel, table=True):
    __tablename__ = "extraction_runs"  # type: ignore

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    source_id: uuid.UUID = Field(foreign_key="card_knowledge_sources.id", index=True)
    
    target_card_id: Optional[uuid.UUID] = Field(default=None, foreign_key="card_catalogs.id")
    target_card_name: Optional[str] = Field(default=None, max_length=255)
    
    model: str = Field(max_length=255)
    provider: str = Field(max_length=255)
    prompt_version: str = Field(max_length=255)
    
    status: ProcessingStatus = Field(default=ProcessingStatus.QUEUED)
    
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = Field(default=None)
    
    tokens_used: int = Field(default=0)
    cost_estimate: float = Field(default=0.0)
    error_message: Optional[str] = Field(default=None)

class CardExtractionCandidate(SQLModel, table=True):
    __tablename__ = "card_extraction_candidates"  # type: ignore

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    card_id: uuid.UUID = Field(foreign_key="card_catalogs.id", index=True)
    
    candidate_type: CandidateType = Field(index=True)
    entity_identifier: Optional[str] = Field(default=None, max_length=255, index=True)
    field_name: str = Field(max_length=255)
    
    current_value: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    proposed_value: dict = Field(default_factory=dict, sa_column=Column(JSON))
    
    change_type: str = Field(default="ADD", max_length=50)
    published_rule_id: Optional[str] = Field(default=None, max_length=255)
    
    confidence_score: float = Field(default=0.0)
    
    source_id: uuid.UUID = Field(foreign_key="card_knowledge_sources.id")
    source_page: Optional[int] = Field(default=None)
    source_text: str = Field(max_length=4000)
    
    status: CandidateStatus = Field(default=CandidateStatus.PENDING_REVIEW, index=True)
    review_notes: Optional[str] = Field(default=None, max_length=2000)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_at: Optional[datetime] = Field(default=None)
    reviewed_by: Optional[uuid.UUID] = Field(default=None, foreign_key="users.id")

class CardIntelligenceVersion(SQLModel, table=True):
    __tablename__ = "card_intelligence_versions"  # type: ignore

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    card_id: uuid.UUID = Field(foreign_key="card_catalogs.id", index=True)
    version: int = Field(index=True)
    
    source_snapshot_ids: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    candidate_ids: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    
    published_at: datetime = Field(default_factory=datetime.utcnow)
    published_by: uuid.UUID = Field(foreign_key="users.id")
    
    change_summary: dict = Field(default_factory=dict, sa_column=Column(JSON))
