import json
import logging
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Body, BackgroundTasks, Request
from sqlmodel.ext.asyncio.session import AsyncSession
from pydantic import BaseModel, field_validator

from api.deps import get_db
from auth.dependencies import get_current_user, get_current_admin_user
from auth.schemas import UserResponse
from models.user import User
from .service import CardIntelligenceService
from .extraction.structured_parser import StructuredParser
from .monitor_models import CardMonitoring
from models.card_catalog import CardCatalog
from sqlmodel import select
from core.rate_limit import limiter
from services.audit_service import AuditService

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
    stmt = select(CardMonitoring.stored_text).where(CardMonitoring.card_id == card_id)
    result = await db.execute(stmt)
    cleaned_markdown = result.scalar_one_or_none()
    
    if not cleaned_markdown:
        raise HTTPException(status_code=404, detail="No historical page snapshot found for this card ID")
        
    try:
        parser = StructuredParser()
        suggested_json_schema = await parser.extract_structured_card_data(cleaned_markdown)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM Data Extraction Step Failed: {str(e)}")
        
    return {
        "card_id": str(card_id),
        "source_markdown": cleaned_markdown,
        "suggested_database_json": suggested_json_schema.dict()
    }

@router.post("/review/action")
@limiter.limit("20/minute")
async def commit_admin_review_decision(request: Request, payload: AdminReviewActionPayload, current_admin: UserResponse = Depends(get_current_admin_user), db: AsyncSession = Depends(get_db)):
    """Applies admin manual alterations directly to the live calculations database portfolio."""
    if not payload.approve:
        await AuditService.log_action(db, current_admin.id, "REVIEW_REJECTED", "CardCatalog", str(payload.card_id), payload.dict(), request)
        await db.commit()
        return {"status": "rejected", "message": "Changes discarded. Card flagged for re-scraping."}
        
    stmt = select(CardCatalog).where(CardCatalog.id == UUID(payload.card_id))
    result = await db.execute(stmt)
    card = result.scalar_one_or_none()
    
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
        
    card.card_name = payload.edited_json.get("card_name", card.card_name)
    card.bank_name = payload.edited_json.get("bank_issuer", card.bank_name)
    card.annual_fee = payload.edited_json.get("annual_fee", card.annual_fee)
    card.joining_fee = payload.edited_json.get("joining_fee", card.joining_fee)
    card.fee_waiver_spend_threshold = payload.edited_json.get("fee_waiver_spend_threshold", card.fee_waiver_spend_threshold)
    card.reward_rules_json = payload.edited_json.get("reward_rules", [])
    card.milestones_json = payload.edited_json.get("milestones", [])
    card.is_approved = True
    
    db.add(card)
    await AuditService.log_action(db, current_admin.id, "REVIEW_APPROVED", "CardCatalog", str(payload.card_id), payload.dict(), request)
    await db.commit()
    
    return {"status": "success", "message": "Card updated in production schema"}

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
    from .monitor_service import fetch_and_clean_card_page
    from .service import CardIntelligenceService
    from sqlmodel import select
    from models.ingestion import SourceDocument
    from services.html_parser import parse_and_chunk_markdown
    import hashlib

    # 1. Fetch and scrub the website HTML text into readable markdown content
    try:
        logger.debug("payload.html_source length = %d", len(payload.html_source) if payload.html_source else 0)
        source_data = payload.html_source if payload.html_source else payload.url
        logger.debug("source_data begins with: %s", source_data[:50] if source_data else "")
        cleaned_markdown = fetch_and_clean_card_page(source_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Web Scraping Failed: {str(e)}")

    # 2. Derive a predictable SHA-256 baseline identifier token mapping to this page layout text
    text_hash = hashlib.sha256(cleaned_markdown.encode('utf-8')).hexdigest()
    
    # 3. Get or create the card catalog entry to ensure a valid foreign key UUID
    service = CardIntelligenceService(session)
    if payload.card_id:
        try:
            valid_card_id = UUID(payload.card_id)
            # Verify card exists
            from models.card_catalog import CardCatalog
            card_exists = await session.get(CardCatalog, valid_card_id)
            if not card_exists:
                raise ValueError("Provided Card ID does not exist")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid Card ID: {e}")
    else:
        if not payload.bank_name or not payload.card_name:
            raise HTTPException(status_code=400, detail="Bank Name and Card Name are required for new ingestions.")
        valid_card_id = await service.find_or_create_card(payload.bank_name, payload.card_name)

    # 4. Save the baseline parameters directly to the CardMonitoring database table row state
    from .monitor_models import CardMonitoring
    
    # Check if a monitor record already exists for this card to prevent PK conflicts
    stmt = select(CardMonitoring).where(CardMonitoring.card_id == valid_card_id)
    result = await session.execute(stmt)
    existing_record = result.scalar_one_or_none()
    
    if existing_record:
        existing_record.card_url = payload.url
        existing_record.last_seen_hash = text_hash
        existing_record.stored_text = cleaned_markdown
        session.add(existing_record)
    else:
        new_monitor_record = CardMonitoring(
            card_id=valid_card_id,
            card_url=payload.url,
            last_seen_hash=text_hash,
            stored_text=cleaned_markdown
        )
        session.add(new_monitor_record)
        
    await AuditService.log_action(session, current_admin.id, "INGEST_RAW_URL", "CardMonitoring", str(valid_card_id), payload.dict(), request)
    
    # 4.5. Also create a SourceDocument and chunk it for RAG (Playground)
    doc = SourceDocument(
        card_catalog_id=valid_card_id,
        source_type="HTML_PAGE",
        file_name=payload.url[:250], # Truncate if URL is extremely long
        checksum_sha256=text_hash,
        file_size=len(cleaned_markdown.encode('utf-8')),
        status="UPLOADED"
    )
    session.add(doc)
    await session.commit()
    await session.refresh(doc)
    
    # Queue chunking background task
    background_tasks.add_task(parse_and_chunk_markdown, session, doc, cleaned_markdown)

    # 5. Return the newly registered tracking token to the frontend UI
    return {
        "status": "success",
        "card_id": str(valid_card_id),
        "document_id": str(doc.id),
        "message": "Raw page layout parsed successfully. Redirecting to extraction dashboard..."
    }
