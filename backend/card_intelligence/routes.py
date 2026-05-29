from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Body, BackgroundTasks
from sqlmodel.ext.asyncio.session import AsyncSession
from pydantic import BaseModel

from api.deps import get_db
from auth.dependencies import get_current_user
from models.user import User
from .schemas import (
    KnowledgeSourceResponse, 
    JobResponse,
    CardExtractionCandidateResponse,
    CandidateUpdatePayload,
    PublishPreviewResponse,
    PublishResponse
)
from .service import CardIntelligenceService

router = APIRouter(prefix="/card-intelligence", tags=["Card Intelligence"])

@router.post("/sources/upload", response_model=KnowledgeSourceResponse)
async def upload_source(
    bank_name: str = Form(...),
    card_name: str = Form(...),
    source_title: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Uploads a PDF source-of-truth document for a specific card."""
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF documents are supported.")
        
    service = CardIntelligenceService(db)
    
    # Find or Create target card
    card_id = await service.find_or_create_card(bank_name, card_name)
    
    doc = await service.upload_document(
        card_id=card_id,
        source_title=source_title,
        file=file,
        user_id=current_user.id
    )
    # The return requires is_latest_version, which is true right after upload
    doc_dict = doc.model_dump()
    doc_dict["is_latest_version"] = True
    return doc_dict

class UrlSourcePayload(BaseModel):
    bank_name: str
    card_name: str
    url: str
    source_title: str

@router.post("/sources/url", response_model=KnowledgeSourceResponse)
async def add_url_source(
    payload: UrlSourcePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submits a URL to be fetched and stored as a knowledge source."""
    service = CardIntelligenceService(db)
    
    # Find or Create target card
    card_id = await service.find_or_create_card(payload.bank_name, payload.card_name)
    
    doc = await service.add_url_source(
        card_id=card_id,
        url=payload.url,
        source_title=payload.source_title,
        user_id=current_user.id
    )
    
    doc_dict = doc.model_dump()
    doc_dict["is_latest_version"] = True
    return doc_dict

@router.get("/cards/{card_id}/sources", response_model=List[KnowledgeSourceResponse])
async def list_sources(
    card_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists all knowledge sources for a card, including processing status."""
    service = CardIntelligenceService(db)
    return await service.list_sources(card_id)

@router.post("/sources/{source_id}/process", response_model=JobResponse)
async def process_source(
    source_id: UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually triggers the ingestion pipeline for a source."""
    service = CardIntelligenceService(db)
    return await service.trigger_processing(source_id, current_user.id, background_tasks)

@router.get("/cards/{card_id}/candidates", response_model=List[CardExtractionCandidateResponse])
async def list_candidates(
    card_id: UUID,
    status: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists all extraction candidates for a card, optionally filtered by status."""
    service = CardIntelligenceService(db)
    return await service.list_candidates(card_id, status)

@router.put("/candidates/{candidate_id}", response_model=CardExtractionCandidateResponse)
async def update_candidate(
    candidate_id: UUID,
    payload: CandidateUpdatePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Updates a candidate's status, proposed_value, or review_notes."""
    service = CardIntelligenceService(db)
    return await service.update_candidate(candidate_id, payload, current_user.id)

@router.post("/cards/{card_id}/publish-preview", response_model=PublishPreviewResponse)
async def publish_preview(
    card_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns a dry-run summary of changes that would be published."""
    service = CardIntelligenceService(db)
    return await service.publish_preview(card_id)

@router.post("/cards/{card_id}/publish", response_model=PublishResponse)
async def publish_candidates(
    card_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Publishes approved candidates to the production tables."""
    service = CardIntelligenceService(db)
    return await service.publish_candidates(card_id, current_user.id)
