from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Body, BackgroundTasks
from sqlmodel.ext.asyncio.session import AsyncSession
from pydantic import BaseModel

from api.deps import get_db
from auth.dependencies import get_current_user
from models.user import User
from .service import CardIntelligenceService
from .extraction.structured_parser import StructuredParser
from .monitor_models import CardMonitoring
from models.card_catalog import CardCatalog
from sqlmodel import select

router = APIRouter(prefix="/card-intelligence", tags=["Card Intelligence"])

class RawIngestionRequest(BaseModel):
    url: str
    bank_name: str
    card_name: str
    source_title: str
    html_source: Optional[str] = None


class AdminReviewActionPayload(BaseModel):
    card_id: str
    edited_json: dict
    approve: bool

@router.get("/review/{card_id}")
async def fetch_card_payload_for_review(card_id: UUID, db: AsyncSession = Depends(get_db)):
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
async def commit_admin_review_decision(payload: AdminReviewActionPayload, db: AsyncSession = Depends(get_db)):
    """Applies admin manual alterations directly to the live calculations database portfolio."""
    if not payload.approve:
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
    await db.commit()
    
    return {"status": "success", "message": "Card updated in production schema"}

@router.post("/ingest-raw", status_code=201)
async def ingest_raw_bank_url(
    payload: RawIngestionRequest, 
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
    import hashlib

    # 1. Fetch and scrub the website HTML text into readable markdown content
    try:
        print(f"DEBUG: payload.html_source length = {len(payload.html_source) if payload.html_source else 0}")
        source_data = payload.html_source if payload.html_source else payload.url
        print(f"DEBUG: source_data begins with: {source_data[:50]}")
        cleaned_markdown = fetch_and_clean_card_page(source_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Web Scraping Failed: {str(e)}")

    # 2. Derive a predictable MD5 baseline identifier token mapping to this page layout text
    text_hash = hashlib.md5(cleaned_markdown.encode('utf-8')).hexdigest()
    
    # 3. Get or create the card catalog entry to ensure a valid foreign key UUID
    service = CardIntelligenceService(session)
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
        
    await session.commit()

    # 5. Return the newly registered tracking token to the frontend UI
    return {
        "status": "success",
        "card_id": str(valid_card_id),
        "message": "Raw page layout parsed successfully. Redirecting to extraction dashboard..."
    }
