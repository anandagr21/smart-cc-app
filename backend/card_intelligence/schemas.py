from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from .models import CardDocumentType, DocumentProcessingStatus

class DocumentResponse(BaseModel):
    id: UUID
    card_id: UUID
    document_type: CardDocumentType
    file_name: str
    uploaded_at: datetime
    processing_status: DocumentProcessingStatus
    document_version: int
    is_latest_version: bool
    
    model_config = ConfigDict(from_attributes=True)

class JobResponse(BaseModel):
    id: UUID
    document_id: UUID
    status: DocumentProcessingStatus
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    logs: Optional[List[str]]
    pipeline_version: str
    trigger_source: str
    
    model_config = ConfigDict(from_attributes=True)
