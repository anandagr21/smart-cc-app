"""
Module: backend.schemas.admin_ingestion
Responsibility: Pydantic schemas for the Admin Ingestion Workspace.
"""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CardFieldSourceResponse(BaseModel):
    id: UUID
    source_type: str
    source_url: str | None = None
    evidence_snippet: str | None = None
    retrieved_at: datetime
    confidence_contribution: float

    model_config = ConfigDict(from_attributes=True)


class CardIngestionFieldResponse(BaseModel):
    id: UUID
    field_name: str
    field_importance: str
    extracted_value: Any | None = None
    verification_status: str
    confidence_score: float
    sources: list[CardFieldSourceResponse] = []

    model_config = ConfigDict(from_attributes=True)


class CardIngestionSessionResponse(BaseModel):
    id: UUID
    card_name: str
    bank_name: str
    status: str
    review_priority: str
    confidence_score_avg: float
    verified_fields_count: int
    conflicts_count: int
    missing_count: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IngestionAuditLogResponse(BaseModel):
    id: UUID
    session_id: UUID
    field_id: UUID | None = None
    admin_user_id: UUID
    original_value: Any | None = None
    modified_value: Any | None = None
    reason: str | None = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Requests ---

class SessionCreateRequest(BaseModel):
    card_name: str
    bank_name: str

class FieldUpdateRequest(BaseModel):
    extracted_value: Any | None = None
    verification_status: str | None = None
