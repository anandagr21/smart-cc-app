"""
Module: backend.models.ingestion
Responsibility: Defines models for the AI-Assisted Credit Card Catalog Ingestion System.

This includes:
- CardCatalogVersion: Immutable historical snapshot of a card.
- CardIngestionSession: The active ingestion draft.
- CardIngestionField: Field-level tracking.
- CardFieldSource: Evidence tracking per field.
- IngestionAuditLog: Audit trail of admin actions.
"""

from datetime import datetime
from typing import Any
from uuid import UUID, uuid4
from sqlalchemy import Column, Text, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship, SQLModel, AutoString

class CardCatalogVersion(SQLModel, table=True):
    __tablename__ = "card_catalog_versions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    card_catalog_id: UUID = Field(foreign_key="card_catalogs.id", index=True)
    version_number: int = Field(default=1)
    
    # Structured Schema
    annual_fee: float | None = None
    joining_fee: float | None = None
    reward_rate: float | None = None
    
    # Flexible long-tail benefits
    benefit_metadata: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    
    published_at: datetime = Field(default_factory=datetime.utcnow)
    published_by_admin_id: UUID | None = Field(default=None, foreign_key="users.id")


class CardIngestionSession(SQLModel, table=True):
    __tablename__ = "card_ingestion_sessions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    card_catalog_id: UUID | None = Field(default=None, foreign_key="card_catalogs.id", index=True)
    card_name: str = Field(max_length=200)
    bank_name: str = Field(max_length=200)
    
    status: str = Field(default="DRAFT", max_length=50) # DRAFT, AI_EXTRACTED, AI_VERIFIED, REVIEW_REQUIRED, APPROVED, PUBLISHED
    review_priority: str = Field(default="LOW", max_length=50) # CRITICAL, HIGH, MEDIUM, LOW
    
    confidence_score_avg: float = Field(default=0.0)
    verified_fields_count: int = Field(default=0)
    conflicts_count: int = Field(default=0)
    missing_count: int = Field(default=0)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )


class CardIngestionField(SQLModel, table=True):
    __tablename__ = "card_ingestion_fields"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    session_id: UUID = Field(foreign_key="card_ingestion_sessions.id", index=True)
    
    field_name: str = Field(max_length=100) # e.g. "annual_fee", "lounge_access"
    field_importance: str = Field(default="LOW", max_length=50) # CRITICAL, HIGH, LOW
    
    extracted_value: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    verification_status: str = Field(default="EXTRACTED", max_length=50) # EXTRACTED, VERIFIED, CONFLICT, MISSING, MANUALLY_EDITED, APPROVED
    confidence_score: float = Field(default=0.0)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )


class CardFieldSource(SQLModel, table=True):
    __tablename__ = "card_field_sources"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    field_id: UUID = Field(foreign_key="card_ingestion_fields.id", index=True)
    
    source_type: str = Field(max_length=100) # MARKETING_PAGE, MITC_PDF, FEE_SCHEDULE, REWARDS_PAGE, BANK_FAQ, MANUAL_ADMIN
    source_url: str | None = Field(default=None, max_length=2000)
    evidence_snippet: str | None = Field(default=None)
    
    effective_date: datetime | None = None
    expiry_date: datetime | None = None
    retrieved_at: datetime = Field(default_factory=datetime.utcnow)
    
    confidence_contribution: float = Field(default=0.0)


class IngestionAuditLog(SQLModel, table=True):
    __tablename__ = "ingestion_audit_logs"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    session_id: UUID = Field(foreign_key="card_ingestion_sessions.id", index=True)
    field_id: UUID | None = Field(default=None, foreign_key="card_ingestion_fields.id")
    admin_user_id: UUID = Field(foreign_key="users.id")
    
    original_value: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    modified_value: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    
    reason: str | None = Field(default=None)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class BankExtractionTemplate(SQLModel, table=True):
    __tablename__ = "bank_extraction_templates"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    bank_name: str = Field(max_length=200, index=True)
    
    # A mapping of raw extracted text to canonical field names
    # e.g. {"Renewal Membership Fee": "annual_fee"}
    schema_mapping: dict[str, str] = Field(default_factory=dict, sa_column=Column(JSON))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )


class SourceDocument(SQLModel, table=True):
    __tablename__ = "source_documents"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    card_catalog_id: UUID | None = Field(default=None, foreign_key="card_catalogs.id", index=True)
    
    source_type: str = Field(max_length=100) # MITC_PDF, FEE_SCHEDULE, MARKETING_PAGE, REWARDS_PAGE
    file_name: str | None = Field(default=None, max_length=255)
    source_url: str | None = Field(default=None, max_length=2000)
    
    checksum_sha256: str = Field(max_length=64, index=True)
    file_size: int = Field(default=0)
    page_count: int = Field(default=0)
    
    status: str = Field(default="UPLOADED", max_length=50) # UPLOADED, PROCESSING, PROCESSED, FAILED, ARCHIVED
    
    processing_time_ms: int = Field(default=0)
    chunks_created: int = Field(default=0)
    pages_processed: int = Field(default=0)
    
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: datetime | None = None


class SourceChunk(SQLModel, table=True):
    __tablename__ = "source_chunks"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    document_id: UUID = Field(foreign_key="source_documents.id", index=True)
    
    page_number: int = Field(default=1)
    chunk_index: int = Field(default=0)
    chunk_text: str = Field(sa_column=Column(Text))
    
    token_count: int = Field(default=0)
    checksum: str = Field(max_length=64, index=True)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)


from enum import Enum as PyEnum

import enum

class BenchmarkErrorReason(str, enum.Enum):
    RETRIEVAL_FAILURE = "RETRIEVAL_FAILURE"
    EXTRACTION_FAILURE = "EXTRACTION_FAILURE" 
    SCHEMA_VALIDATION_FAILURE = "SCHEMA_VALIDATION_FAILURE"
    NO_VALUE_FOUND = "NO_VALUE_FOUND"
    PARTIAL_MATCH = "PARTIAL_MATCH"
    AMBIGUOUS_LABEL = "AMBIGUOUS_LABEL"
    OCR_ISSUE = "OCR_ISSUE"
    MULTIPLE_CANDIDATES = "MULTIPLE_CANDIDATES"
    PROMPT_FAILURE = "PROMPT_FAILURE"
    SCHEMA_FAILURE = "SCHEMA_FAILURE"

class PromptTemplate(SQLModel, table=True):
    __tablename__ = "prompt_templates"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(max_length=100)
    version: str = Field(max_length=50)
    field_name: str = Field(max_length=100)
    hypothesis: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=255)
    template_text: str = Field(sa_column=Column(Text))
    is_active: bool = Field(default=True)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ExtractionRun(SQLModel, table=True):
    __tablename__ = "extraction_runs"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    document_id: UUID = Field(foreign_key="source_documents.id", index=True)
    
    field_name: str = Field(max_length=100)
    model_name: str = Field(max_length=100)
    prompt_template_id: UUID = Field(foreign_key="prompt_templates.id", index=True)
    
    latency_ms: int | None = Field(default=None)
    prompt_tokens: int | None = Field(default=None)
    completion_tokens: int | None = Field(default=None)
    cost_usd: float | None = Field(default=None)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ExtractedFieldCandidate(SQLModel, table=True):
    __tablename__ = "extracted_field_candidates"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    extraction_run_id: UUID = Field(foreign_key="extraction_runs.id", index=True)
    
    normalized_field_name: str = Field(max_length=100)
    candidate_value: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    admin_corrected_value: dict[str, Any] | None = Field(default=None, sa_column=Column(JSONB))
    
    source_chunk_id: UUID | None = Field(default=None, foreign_key="source_chunks.id")
    retrieval_score: float | None = Field(default=None)
    retrieval_rank: int | None = Field(default=None)
    
    explanation: str | None = Field(default=None, sa_column=Column(Text))
    status: str = Field(default="PENDING", max_length=50) # PENDING, EXTRACTED, REJECTED, ACCEPTED
    
    created_at: datetime = Field(default_factory=datetime.utcnow)


class BenchmarkDataset(SQLModel, table=True):
    __tablename__ = "benchmark_datasets"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(max_length=200)
    status: str = Field(default="DRAFT", max_length=50) # DRAFT, EVALUATING, LOCKED
    dataset_type: str = Field(default="REGRESSION", max_length=50) # GOLD_STANDARD, REGRESSION, EXPERIMENTAL
    
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ExtractionBenchmark(SQLModel, table=True):
    __tablename__ = "extraction_benchmarks"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    dataset_id: UUID | None = Field(default=None, foreign_key="benchmark_datasets.id", index=True)
    document_id: UUID = Field(foreign_key="source_documents.id", index=True)
    field_name: str = Field(max_length=100)
    
    expected_value: dict[str, Any] | None = Field(default=None, sa_column=Column(JSONB))
    verified_by_admin: bool = Field(default=True)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)


class BenchmarkRun(SQLModel, table=True):
    __tablename__ = "benchmark_runs"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    benchmark_id: UUID = Field(foreign_key="extraction_benchmarks.id", index=True)
    dataset_id: UUID | None = Field(default=None, foreign_key="benchmark_datasets.id", index=True)
    
    field_name: str | None = Field(default=None, max_length=100)
    prompt_template_id: UUID | None = Field(default=None, foreign_key="prompt_templates.id", index=True)
    prompt_template_version: str | None = Field(default=None, max_length=50)
    
    extraction_run_id: UUID | None = Field(default=None, foreign_key="extraction_runs.id", index=True)
    
    expected_value: dict[str, Any] | None = Field(default=None, sa_column=Column(JSONB))
    actual_value: dict[str, Any] | None = Field(default=None, sa_column=Column(JSONB))
    candidate_value: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    
    retrieved_chunks_snapshot: dict[str, Any] | None = Field(default=None, sa_column=Column(JSONB))
    correct_chunk_found: bool | None = Field(default=None)
    
    score: float | None = Field(default=None)
    evaluator_version: str | None = Field(default=None, max_length=50)
    error_reason: BenchmarkErrorReason | None = Field(default=None, sa_type=AutoString)
    failure_severity: str | None = Field(default=None, max_length=50) # LOW, MEDIUM, HIGH
    
    created_at: datetime = Field(default_factory=datetime.utcnow)


class EvaluationJob(SQLModel, table=True):
    __tablename__ = "evaluation_jobs"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    dataset_id: UUID = Field(foreign_key="benchmark_datasets.id", index=True)
    status: str = Field(default="PENDING", max_length=50) # PENDING, RUNNING, COMPLETED, FAILED
    
    total_benchmarks: int = Field(default=0)
    completed_benchmarks: int = Field(default=0)
    
    started_at: datetime | None = Field(default=None)
    completed_at: datetime | None = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
