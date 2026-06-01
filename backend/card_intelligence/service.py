from uuid import UUID
from fastapi import UploadFile, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, desc
import logging
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel

class ValidationResult(BaseModel):
    valid: bool
    reason: Optional[str] = None

from .models import CardKnowledgeSource, KnowledgeIngestionJob, KnowledgeSourceType, ProcessingStatus
from .storage import LocalKnowledgeStorage
from .fetcher import UrlKnowledgeFetcher
from models.card_catalog import CardCatalog

logger = logging.getLogger(__name__)

class CardIntelligenceService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.fetcher = UrlKnowledgeFetcher()
        
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
        
    async def upload_document(
        self, 
        card_id: UUID, 
        source_title: str, 
        file: UploadFile,
        user_id: UUID
    ) -> CardKnowledgeSource:
        # Validate Card
        card = await self.db.get(CardCatalog, card_id)
        if not card:
            raise HTTPException(status_code=404, detail="Card catalog entry not found")
            
        # Determine next version
        stmt = select(CardKnowledgeSource).where(
            CardKnowledgeSource.card_id == card_id, 
            CardKnowledgeSource.source_title == source_title
        ).order_by(desc(CardKnowledgeSource.document_version))
        result = await self.db.execute(stmt)
        latest_doc = result.scalars().first()
        version = (latest_doc.document_version + 1) if latest_doc else 1
        
        # Save file to storage
        storage_path, checksum = await LocalKnowledgeStorage.save_document(
            file=file,
            bank_name=card.bank_name,
            card_name=card.card_name,
            source_type=KnowledgeSourceType.PDF.value,
            version=version
        )
        
        # Persist Metadata
        doc = CardKnowledgeSource(
            card_id=card_id,
            source_type=KnowledgeSourceType.PDF,
            source_title=source_title,
            file_name=file.filename or "unknown.pdf",
            storage_path=storage_path,
            mime_type=file.content_type or "application/pdf",
            uploaded_by=user_id,
            document_version=version,
            checksum_hash=checksum,
            processing_status=ProcessingStatus.UPLOADED
        )
        self.db.add(doc)
        await self.db.commit()
        await self.db.refresh(doc)
        
        return doc

    async def add_url_source(
        self,
        card_id: UUID,
        url: str,
        source_title: str,
        user_id: UUID
    ) -> CardKnowledgeSource:
        # Validate Card
        card = await self.db.get(CardCatalog, card_id)
        if not card:
            raise HTTPException(status_code=404, detail="Card catalog entry not found")

        # Fetch URL and discover links
        try:
            final_url, raw_html, discovered_links = await self.fetcher.fetch_and_discover(url)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        # Determine next version
        stmt = select(CardKnowledgeSource).where(
            CardKnowledgeSource.card_id == card_id, 
            CardKnowledgeSource.source_title == source_title
        ).order_by(desc(CardKnowledgeSource.document_version))
        result = await self.db.execute(stmt)
        latest_doc = result.scalars().first()
        version = (latest_doc.document_version + 1) if latest_doc else 1

        # Save HTML to storage
        storage_path, checksum = await LocalKnowledgeStorage.save_html(
            html_content=raw_html,
            bank_name=card.bank_name,
            card_name=card.card_name,
            file_name=source_title or "url_source",
            version=version
        )

        # Create main URL source (since we just fetched it, we can put it in UPLOADED or IMPORTED)
        main_source = CardKnowledgeSource(
            card_id=card_id,
            source_type=KnowledgeSourceType.URL,
            source_url=final_url,
            source_title=source_title,
            storage_path=storage_path,
            mime_type="text/html",
            uploaded_by=user_id,
            document_version=version,
            checksum_hash=checksum,
            processing_status=ProcessingStatus.UPLOADED
        )
        self.db.add(main_source)

        # Create DISCOVERED sources for links
        for link in discovered_links:
            disc_source = CardKnowledgeSource(
                card_id=card_id,
                source_type=KnowledgeSourceType.URL,
                source_url=link.url,
                source_title=link.title or link.text,
                uploaded_by=user_id,
                processing_status=ProcessingStatus.DISCOVERED
            )
            self.db.add(disc_source)

        await self.db.commit()
        await self.db.refresh(main_source)

        return main_source

    async def list_sources(self, card_id: UUID) -> List[dict]:
        # Return dictionaries representing KnowledgeSourceResponse to easily calculate is_latest_version
        stmt = select(CardKnowledgeSource).where(CardKnowledgeSource.card_id == card_id).order_by(desc(CardKnowledgeSource.uploaded_at))
        result = await self.db.execute(stmt)
        docs = result.scalars().all()
        
        # Group by title to find latest versions
        latest_versions = {}
        for doc in docs:
            t = doc.source_title or str(doc.id)
            if t not in latest_versions or doc.document_version > latest_versions[t]:
                latest_versions[t] = doc.document_version
                
        responses = []
        for doc in docs:
            doc_dict = doc.model_dump()
            doc_dict["is_latest_version"] = (doc.document_version == latest_versions.get(doc.source_title or str(doc.id)))
            responses.append(doc_dict)
            
        return responses

    async def trigger_processing(self, source_id: UUID, user_id: UUID, background_tasks: BackgroundTasks) -> KnowledgeIngestionJob:
        doc = await self.db.get(CardKnowledgeSource, source_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Source not found")
            
        if doc.processing_status in [ProcessingStatus.QUEUED, ProcessingStatus.PROCESSING]:
            raise HTTPException(status_code=400, detail="Source is already queued or processing")
            
        # Update doc status
        doc.processing_status = ProcessingStatus.QUEUED
        
        # Create Job
        job = KnowledgeIngestionJob(
            knowledge_source_id=doc.id,
            status=ProcessingStatus.QUEUED,
            trigger_source="manual",
            triggered_by=user_id,
            logs=["Job manually triggered. Awaiting processing..."]
        )
        self.db.add(doc)
        self.db.add(job)
        await self.db.commit()
        await self.db.refresh(job)
        
        # Schedule background task
        background_tasks.add_task(self._run_extraction_pipeline, job.id, doc.id)
        
        return job

    async def _run_extraction_pipeline(self, job_id: UUID, source_id: UUID):
        from core.database import async_session_factory
        from .extraction.pipeline import IngestionPipeline
        
        async with async_session_factory() as db:
            pipeline = IngestionPipeline(db)
            await pipeline.run(source_id, job_id)

    async def list_candidates(self, card_id: UUID, status_filter: Optional[str] = None) -> List[dict]:
        from .models import CardExtractionCandidate, CandidateStatus
        stmt = select(CardExtractionCandidate).where(CardExtractionCandidate.card_id == card_id)
        if status_filter:
            try:
                status_enum = CandidateStatus(status_filter)
                stmt = stmt.where(CardExtractionCandidate.status == status_enum)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid status filter")
                
        stmt = stmt.order_by(desc(CardExtractionCandidate.created_at))
        result = await self.db.execute(stmt)
        candidates = result.scalars().all()
        return [c.model_dump() for c in candidates]
        
    async def update_candidate(self, candidate_id: UUID, payload, user_id: UUID) -> dict:
        from .models import CardExtractionCandidate, CandidateStatus
        candidate = await self.db.get(CardExtractionCandidate, candidate_id)
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
            
        try:
            status_enum = CandidateStatus(payload.status)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status")
            
        candidate.status = status_enum
        if payload.proposed_value is not None:
            candidate.proposed_value = payload.proposed_value
        if payload.review_notes is not None:
            candidate.review_notes = payload.review_notes
            
        candidate.reviewed_at = datetime.utcnow()
        candidate.reviewed_by = user_id
        
        self.db.add(candidate)
        await self.db.commit()
        await self.db.refresh(candidate)
        
        return candidate.model_dump()
        
    async def publish_preview(self, card_id: UUID) -> dict:
        from .models import CardExtractionCandidate, CandidateStatus, CandidateType
        stmt = select(CardExtractionCandidate).where(
            CardExtractionCandidate.card_id == card_id,
            CardExtractionCandidate.status == CandidateStatus.APPROVED
        )
        result = await self.db.execute(stmt)
        approved_candidates = result.scalars().all()
        
        preview = {
            "reward_rules_added": 0,
            "reward_rules_updated": 0,
            "reward_rules_removed": 0,
            "benefits_added": 0,
            "fees_updated": 0,
            "total_candidates": len(approved_candidates)
        }
        
        for c in approved_candidates:
            if c.candidate_type == CandidateType.REWARD_RULE:
                if getattr(c, "change_type", "ADD") == "ADD":
                    preview["reward_rules_added"] += 1
                elif getattr(c, "change_type", "ADD") == "UPDATE":
                    preview["reward_rules_updated"] += 1
                elif getattr(c, "change_type", "ADD") == "STALE":
                    preview["reward_rules_removed"] += 1
            elif c.candidate_type == CandidateType.BENEFIT:
                preview["benefits_added"] += 1
            elif c.candidate_type == CandidateType.FEE_RULE:
                preview["fees_updated"] += 1
                
        return preview
        
    async def publish_candidates(self, card_id: UUID, user_id: UUID) -> dict:
        from .models import CardExtractionCandidate, CandidateStatus, CardIntelligenceVersion, CandidateType
        from models.card_catalog import CardCatalog
        from rewards.models import RewardRule
        stmt = select(CardExtractionCandidate).where(
            CardExtractionCandidate.card_id == card_id,
            CardExtractionCandidate.status == CandidateStatus.APPROVED
        )
        result = await self.db.execute(stmt)
        approved_candidates = result.scalars().all()
        
        if not approved_candidates:
            raise HTTPException(status_code=400, detail="No approved candidates to publish")
            
        card = await self.db.get(CardCatalog, card_id)
        if not card:
            raise HTTPException(status_code=404, detail="Card catalog entry not found")

        candidate_ids = []
        for c in approved_candidates:
            if c.candidate_type == CandidateType.FEE_RULE:
                if c.field_name == "annual_fee":
                    card.annual_fee = c.proposed_value.get("value", card.annual_fee)
                elif c.field_name == "joining_fee":
                    card.joining_fee = c.proposed_value.get("value", card.joining_fee)
            
            elif c.candidate_type == CandidateType.CARD_FIELD:
                if c.field_name == "fee_waiver_spend_threshold":
                    card.fee_waiver_spend_threshold = c.proposed_value.get("value", card.fee_waiver_spend_threshold)
            
            elif c.candidate_type in (CandidateType.MILESTONE, CandidateType.REWARD_RULE, CandidateType.BENEFIT, CandidateType.EXCLUSION):
                change_type = getattr(c, "change_type", "ADD")
                
                if change_type == "STALE":
                    if getattr(c, "published_rule_id", None):
                        rule = await self.db.get(RewardRule, UUID(c.published_rule_id))
                        if rule:
                            rule.is_active = False
                            self.db.add(rule)
                elif change_type == "UPDATE":
                    if getattr(c, "published_rule_id", None):
                        rule = await self.db.get(RewardRule, UUID(c.published_rule_id))
                        if rule:
                            rule.rule_config = c.proposed_value
                            self.db.add(rule)
                else: # ADD
                    # Business Logic Priority & Type Resolution
                    rule_type_map = {
                        CandidateType.MILESTONE: "milestone",
                        CandidateType.BENEFIT: "benefit",
                        CandidateType.EXCLUSION: "exclusion",
                    }
                    priority = 50
                    db_rule_type = rule_type_map.get(c.candidate_type, "generic_reward")
                    
                    if c.candidate_type == CandidateType.REWARD_RULE:
                        config = c.proposed_value or {}
                        
                        # Priority Ladder
                        cat = str(config.get("category", "")).lower()
                        if "merchant" in config:
                            priority = 10
                            db_rule_type = "merchant_bonus"
                        elif "online" in cat:
                            priority = 20
                            db_rule_type = "category_bonus"
                            config["payment_mode"] = "online"
                            if config.get("category", "").lower() == "online":
                                del config["category"]
                        elif "offline" in cat:
                            priority = 30
                            db_rule_type = "category_bonus"
                            config["payment_mode"] = "offline"
                            if config.get("category", "").lower() == "offline":
                                del config["category"]
                        elif "category" in config and config["category"].lower() not in ("all spends", "all"):
                            priority = 25
                            db_rule_type = "category_bonus"
                        else:
                            priority = 40
                            if "category" in config:
                                del config["category"]
                            reward_type = config.get("reward_type", "cashback")
                            db_rule_type = "reward_points" if reward_type in ("points", "reward_points") else "cashback"

                    # Validation Gate
                    valid = True
                    reason = None
                    config = c.proposed_value or {}
                    
                    if c.candidate_type == CandidateType.REWARD_RULE:
                        if db_rule_type == "merchant_bonus" and "merchant" not in config:
                            valid, reason = False, "merchant rule missing merchant field"
                        elif db_rule_type == "category_bonus" and "category" not in config and "payment_mode" not in config:
                            valid, reason = False, "category rule missing category or payment_mode field"
                        elif config.get("reward_type") == "cashback":
                            rate = config.get("reward_rate", 0)
                            if rate <= 0 or rate > 1.0:
                                valid, reason = False, f"invalid cashback rate: {rate}"
                        elif config.get("reward_type") in ("points", "reward_points"):
                            ppu = config.get("points_per_unit")
                            sd = config.get("spend_denominator")
                            if not ppu or ppu <= 0 or not sd or sd <= 0:
                                valid, reason = False, "points rule missing valid points_per_unit or spend_denominator"
                                
                    if not valid:
                        logger.warning(f"Rejecting candidate {c.id}: {reason}")
                        c.status = CandidateStatus.REJECTED
                        c.review_notes = reason
                        self.db.add(c)
                        continue

                    rule = RewardRule(
                        card_id=str(card_id),
                        rule_name=c.entity_identifier,
                        rule_type=db_rule_type,
                        rule_config=c.proposed_value,
                        priority=priority
                    )
                    self.db.add(rule)
                    await self.db.flush()
                    c.published_rule_id = str(rule.id)

            c.status = CandidateStatus.PUBLISHED
            self.db.add(c)
            candidate_ids.append(str(c.id))
            
        # --- Card Completeness Audit ---
        from .audit import CardCompletenessAuditor, CardCompletenessError
        
        from rewards.models import RewardRule
        rules_res = await self.db.execute(select(RewardRule).where(RewardRule.card_id == str(card_id), RewardRule.is_active == True))
        new_rules = rules_res.scalars().all()
        
        audit_result = await CardCompletenessAuditor.audit_async(card.card_name, new_rules, self.db)
        if not audit_result.passed:
            await self.db.rollback()
            print("Audit failures:", audit_result.failures)
            raise ValueError(f"Card Completeness Audit Failed:\n" + "\n".join(audit_result.failures))
            
        self.db.add(card)
        
        v_stmt = select(CardIntelligenceVersion).where(CardIntelligenceVersion.card_id == card_id).order_by(desc(CardIntelligenceVersion.version))
        v_result = await self.db.execute(v_stmt)
        latest_v = v_result.scalars().first()
        version_num = (latest_v.version + 1) if latest_v else 1
            
        version = CardIntelligenceVersion(
            card_id=card_id,
            version=version_num,
            candidate_ids=candidate_ids,
            published_by=user_id,
            change_summary={"total_published": len(candidate_ids)}
        )
        self.db.add(version)
        await self.db.commit()
        await self.db.refresh(version)
        
        return {
            "version_id": version.id,
            "version": version.version,
            "published_at": version.published_at,
            "change_summary": version.change_summary
        }

    async def get_card_coverage_stats(self, card_id: UUID) -> dict:
        from models.card_catalog import CardCatalog
        from rewards.models import RewardRule
        from sqlmodel import select
        
        card = await self.db.get(CardCatalog, card_id)
        if not card:
            return None
            
        rules = (await self.db.execute(select(RewardRule).where(RewardRule.card_id == str(card_id), RewardRule.is_active == True))).scalars().all()
        
        merchant_rules = [r for r in rules if r.rule_type == "merchant_bonus"]
        category_rules = [r for r in rules if r.rule_type == "category_bonus"]
        fallback_rules = [r for r in rules if r.priority in (40, 50) and r.rule_name == "ALL_SPENDS"]
        exclusion_rules = [r for r in rules if r.rule_type == "exclusion"]
        
        score = 0
        missing = []
        
        if len(fallback_rules) > 0: score += 20
        else: missing.append("fallback_rules")
        
        if len(merchant_rules) > 0: score += 20
        else: missing.append("merchant_rules")
        
        if len(category_rules) > 0: score += 15
        else: missing.append("category_rules")
        
        if len(exclusion_rules) > 0: score += 10
        else: missing.append("exclusion_rules")
        
        if getattr(card, 'fee_waiver_spend_threshold', None) is not None: score += 10
        else: missing.append("fee_waiver")
        
        if getattr(card, 'annual_fee', None) is not None: score += 5
        else: missing.append("annual_fee")
        
        # Reward valuation is assumed 10 if there is a point value defined.
        # But we'll just check if there's any points rule with a value, or it's a cashback card.
        has_valuation = any(r.rule_config.get("points_per_unit") is not None for r in rules) or any(r.rule_config.get("reward_type") == "cashback" for r in rules)
        if has_valuation: score += 10
        else: missing.append("reward_valuation")
        
        # Benefits and Milestones (mocked missing for now since we don't have tables for them yet)
        missing.extend(["benefits", "milestones"])
        
        return {
            "card": card.card_name,
            "merchant_rules": len(merchant_rules),
            "category_rules": len(category_rules),
            "fallback_rules": len(fallback_rules),
            "missing": missing,
            "coverage_score": score
        }

    async def list_global_candidates(self, status_filter: Optional[str] = None, type_filter: Optional[str] = None, limit: int = 200) -> List[dict]:
        from .models import CardExtractionCandidate, CandidateStatus, CandidateType
        stmt = select(CardExtractionCandidate)
        if status_filter:
            try:
                stmt = stmt.where(CardExtractionCandidate.status == CandidateStatus(status_filter))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid status filter")
        if type_filter:
            try:
                stmt = stmt.where(CardExtractionCandidate.candidate_type == CandidateType(type_filter))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid type filter")
        stmt = stmt.order_by(desc(CardExtractionCandidate.confidence_score)).limit(limit)
        result = await self.db.execute(stmt)
        candidates = result.scalars().all()
        return [c.model_dump() for c in candidates]

    async def get_coverage_summary(self) -> List[dict]:
        from models.card_catalog import CardCatalog
        from sqlmodel import select
        cards_result = await self.db.execute(select(CardCatalog))
        cards = cards_result.scalars().all()

        summary = []
        for card in cards:
            stats = await self.get_card_coverage_stats(card.id)
            if stats:
                summary.append({
                    "card_id": str(card.id),
                    "bank_name": card.bank_name,
                    "card_name": card.card_name,
                    "coverage_pct": stats["coverage_score"],
                    "merchant_rules": stats["merchant_rules"],
                    "category_rules": stats["category_rules"],
                    "fallback_rules": stats["fallback_rules"],
                })
        return summary
