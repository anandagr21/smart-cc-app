import json
import logging
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlmodel.ext.asyncio.session import AsyncSession
from pydantic import BaseModel, field_validator

from api.deps import get_db
from auth.dependencies import get_current_admin_user
from auth.schemas import UserResponse
from core.rate_limit import limiter
from services.card_intelligence_service import CardIntelligenceService

router = APIRouter(prefix="/card-intelligence", tags=["Card Intelligence"])

logger = logging.getLogger(__name__)

class RawIngestionRequest(BaseModel):
    url: str
    bank_name: Optional[str] = None
    card_name: Optional[str] = None
    source_title: str
    html_source: Optional[str] = None
    card_id: Optional[str] = None


class AdminReviewActionPayload(BaseModel):
    card_id: str
    edited_json: dict
    approve: bool
    
    @field_validator("edited_json")
    def validate_json_depth_and_size(cls, v):
        if not isinstance(v, dict):
            raise ValueError("Payload must be a dictionary.")
            
        def check_depth(d, current_depth=1):
            if current_depth > 10:
                raise ValueError("Payload exceeds maximum nesting depth of 10.")
            if isinstance(d, dict):
                for val in d.values():
                    check_depth(val, current_depth + 1)
            elif isinstance(d, list):
                for item in d:
                    check_depth(item, current_depth + 1)
                    
        check_depth(v)
        
        # Check stringified size limit
        serialized = json.dumps(v)
        if len(serialized.encode("utf-8")) > 100000:
            raise ValueError("Payload size exceeds 100KB limit.")
            
        return v

@router.get("/review/{card_id}")
@limiter.limit("20/minute")
async def fetch_card_payload_for_review(request: Request, card_id: UUID, current_admin: UserResponse = Depends(get_current_admin_user), db: AsyncSession = Depends(get_db)):
    """Loads clean text side-by-side with recommended structural JSON schemas."""
    service = CardIntelligenceService(db)
    return await service.fetch_card_payload_for_review(card_id)

@router.post("/review/action")
@limiter.limit("20/minute")
async def commit_admin_review_decision(request: Request, payload: AdminReviewActionPayload, current_admin: UserResponse = Depends(get_current_admin_user), db: AsyncSession = Depends(get_db)):
    """Applies admin manual alterations directly to the live calculations database portfolio."""
    service = CardIntelligenceService(db)
    return await service.commit_admin_review_decision(
        card_id=UUID(payload.card_id),
        payload=payload.edited_json,
        approve=payload.approve,
        admin_id=current_admin.id,
        request=request
    )

@router.post("/ingest-raw", status_code=201)
@limiter.limit("5/minute")
async def ingest_raw_bank_url(
    request: Request,
    payload: RawIngestionRequest, 
    background_tasks: BackgroundTasks,
    current_admin: UserResponse = Depends(get_current_admin_user),
    session: AsyncSession = Depends(get_db)
):
    """
    Takes a live bank webpage URL, cleanly strips the layout noise, 
    generates a unique tracking card_id, stores the initial baseline tracking data, 
    and returns the card_id to the UI for instant workspace redirection.
    """
    service = CardIntelligenceService(session)
    return await service.ingest_raw_bank_url(
        url=payload.url,
        source_title=payload.source_title,
        html_source=payload.html_source,
        card_id=payload.card_id,
        bank_name=payload.bank_name,
        card_name=payload.card_name,
        admin_id=current_admin.id,
        request=request,
        background_tasks=background_tasks
    )
