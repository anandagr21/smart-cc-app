from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from .models import KnowledgeSourceType, ProcessingStatus

class KnowledgeSourceResponse(BaseModel):
    id: UUID
    card_id: UUID
    source_type: KnowledgeSourceType
    source_url: Optional[str]
    source_title: Optional[str]
    file_name: Optional[str]
    uploaded_at: datetime
    processing_status: ProcessingStatus
    document_version: int
    is_latest_version: bool
    
    model_config = ConfigDict(from_attributes=True)

class JobResponse(BaseModel):
    id: UUID
    knowledge_source_id: UUID
    status: ProcessingStatus
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    logs: Optional[List[str]]
    pipeline_version: str
    trigger_source: str
    
    model_config = ConfigDict(from_attributes=True)

class CardExtractionCandidateResponse(BaseModel):
    id: UUID
    card_id: UUID
    candidate_type: str
    entity_identifier: Optional[str]
    field_name: str
    current_value: Optional[dict]
    proposed_value: dict
    change_type: str
    published_rule_id: Optional[str] = None
    confidence_score: float
    source_id: UUID
    source_page: Optional[int]
    source_text: str
    status: str
    review_notes: Optional[str]
    created_at: datetime
    reviewed_at: Optional[datetime]
    reviewed_by: Optional[UUID]
    
    model_config = ConfigDict(from_attributes=True)

class CandidateUpdatePayload(BaseModel):
    status: str
    proposed_value: Optional[dict] = None
    review_notes: Optional[str] = None

class PublishPreviewResponse(BaseModel):
    reward_rules_added: int
    reward_rules_updated: int
    reward_rules_removed: int
    benefits_added: int
    fees_updated: int
    total_candidates: int

class PublishResponse(BaseModel):
    version_id: UUID
    version: int
    published_at: datetime
    change_summary: dict
