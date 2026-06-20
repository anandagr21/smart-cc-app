import hashlib
import logging
from uuid import UUID
from fastapi import HTTPException, Request, BackgroundTasks
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from models.card_catalog import CardCatalog
from card_intelligence.monitor_models import CardMonitoring
from models.ingestion import SourceDocument
from card_intelligence.extraction.structured_parser import StructuredParser
from services.audit_service import AuditService

logger = logging.getLogger(__name__)

class CardIntelligenceService:
    def __init__(self, db: AsyncSession):
        self.db = db
        
    async def find_or_create_card(self, bank_name: str, card_name: str) -> UUID:
        normalized_key = f"{bank_name.strip().lower()}_{card_name.strip().lower()}".replace(" ", "_")
        
        stmt = select(CardCatalog).where(CardCatalog.normalized_card_key == normalized_key)
        result = await self.db.execute(stmt)
        card = result.scalars().first()
        
        if not card:
            # Create the card
            card = CardCatalog(
                bank_name=bank_name.strip(),
                card_name=card_name.strip(),
                normalized_card_key=normalized_key,
                network="N/A",  # Default network, since we don't capture it yet
                is_active=True
            )
            self.db.add(card)
            await self.db.commit()
            await self.db.refresh(card)
            logger.info(f"Created new CardCatalog entry: {bank_name} {card_name}")
            
        return card.id

    async def fetch_card_payload_for_review(self, card_id: UUID) -> dict:
        stmt = select(CardMonitoring.stored_text).where(CardMonitoring.card_id == card_id)
        result = await self.db.execute(stmt)
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

    async def commit_admin_review_decision(self, card_id: UUID, payload: dict, approve: bool, admin_id: str, request: Request) -> dict:
        if not approve:
            await AuditService.log_action(self.db, admin_id, "REVIEW_REJECTED", "CardCatalog", str(card_id), payload, request)
            await self.db.commit()
            return {"status": "rejected", "message": "Changes discarded. Card flagged for re-scraping."}
            
        stmt = select(CardCatalog).where(CardCatalog.id == card_id)
        result = await self.db.execute(stmt)
        card = result.scalar_one_or_none()
        
        if not card:
            raise HTTPException(status_code=404, detail="Card not found")
            
        card.card_name = payload.get("card_name", card.card_name)
        card.bank_name = payload.get("bank_issuer", card.bank_name)
        card.annual_fee = payload.get("annual_fee", card.annual_fee)
        card.joining_fee = payload.get("joining_fee", card.joining_fee)
        card.fee_waiver_spend_threshold = payload.get("fee_waiver_spend_threshold", card.fee_waiver_spend_threshold)
        card.reward_rules_json = payload.get("reward_rules", [])
        card.milestones_json = payload.get("milestones", [])
        card.is_approved = True
        
        self.db.add(card)
        await AuditService.log_action(self.db, admin_id, "REVIEW_APPROVED", "CardCatalog", str(card_id), payload, request)
        await self.db.commit()
        
        return {"status": "success", "message": "Card updated in production schema"}

    async def ingest_raw_bank_url(
        self,
        url: str,
        source_title: str,
        html_source: str | None,
        card_id: str | None,
        bank_name: str | None,
        card_name: str | None,
        admin_id: str,
        request: Request,
        background_tasks: BackgroundTasks
    ) -> dict:
        from card_intelligence.monitor_service import fetch_and_clean_card_page
        from services.html_parser import parse_and_chunk_markdown
        
        try:
            logger.debug("payload.html_source length = %d", len(html_source) if html_source else 0)
            source_data = html_source if html_source else url
            logger.debug("source_data begins with: %s", source_data[:50] if source_data else "")
            cleaned_markdown = fetch_and_clean_card_page(source_data)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Web Scraping Failed: {str(e)}")

        text_hash = hashlib.sha256(cleaned_markdown.encode('utf-8')).hexdigest()
        
        if card_id:
            try:
                valid_card_id = UUID(card_id)
                card_exists = await self.db.get(CardCatalog, valid_card_id)
                if not card_exists:
                    raise ValueError("Provided Card ID does not exist")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid Card ID: {e}")
        else:
            if not bank_name or not card_name:
                raise HTTPException(status_code=400, detail="Bank Name and Card Name are required for new ingestions.")
            valid_card_id = await self.find_or_create_card(bank_name, card_name)

        stmt = select(CardMonitoring).where(CardMonitoring.card_id == valid_card_id)
        result = await self.db.execute(stmt)
        existing_record = result.scalar_one_or_none()
        
        if existing_record:
            existing_record.card_url = url
            existing_record.last_seen_hash = text_hash
            existing_record.stored_text = cleaned_markdown
            self.db.add(existing_record)
        else:
            new_monitor_record = CardMonitoring(
                card_id=valid_card_id,
                card_url=url,
                last_seen_hash=text_hash,
                stored_text=cleaned_markdown
            )
            self.db.add(new_monitor_record)
            
        await AuditService.log_action(self.db, admin_id, "INGEST_RAW_URL", "CardMonitoring", str(valid_card_id), {"url": url}, request)
        
        doc = SourceDocument(
            card_catalog_id=valid_card_id,
            source_type="HTML_PAGE",
            file_name=url[:250],
            checksum_sha256=text_hash,
            file_size=len(cleaned_markdown.encode('utf-8')),
            status="UPLOADED"
        )
        self.db.add(doc)
        await self.db.commit()
        await self.db.refresh(doc)
        
        background_tasks.add_task(parse_and_chunk_markdown, self.db, doc, cleaned_markdown)

        return {
            "status": "success",
            "card_id": str(valid_card_id),
            "document_id": str(doc.id),
            "message": "Raw page layout parsed successfully. Redirecting to extraction dashboard..."
        }
