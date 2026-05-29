from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession

from api.deps import get_db
from auth.dependencies import get_current_user
from models.user import User
from .schemas import DocumentResponse, JobResponse
from .models import CardDocumentType
from .service import CardIntelligenceService

router = APIRouter(tags=["Card Intelligence"])

@router.post("/documents/upload", response_model=DocumentResponse)
async def upload_document(
    card_id: UUID = Form(...),
    document_type: CardDocumentType = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Uploads a source-of-truth document for a specific card."""
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF documents are supported.")
        
    service = CardIntelligenceService(db)
    doc = await service.upload_document(
        card_id=card_id,
        document_type=document_type,
        file=file,
        user_id=current_user.id
    )
    # The return requires is_latest_version, which is true right after upload
    doc_dict = doc.model_dump()
    doc_dict["is_latest_version"] = True
    return doc_dict

@router.get("/cards/{card_id}/documents", response_model=List[DocumentResponse])
async def list_documents(
    card_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists all uploaded documents for a card, including processing status."""
    service = CardIntelligenceService(db)
    return await service.list_documents(card_id)

@router.post("/documents/{document_id}/process", response_model=JobResponse)
async def process_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually triggers the ingestion pipeline for a document."""
    service = CardIntelligenceService(db)
    return await service.trigger_processing(document_id, current_user.id)
