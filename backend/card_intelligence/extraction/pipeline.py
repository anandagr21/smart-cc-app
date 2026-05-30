import logging
import uuid
import json
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from .parser import DocumentParser
from .llm import LangChainExtractor
from .schemas import CardIntelligenceExtraction
from card_intelligence.models import (
    CardKnowledgeSource, 
    KnowledgeIngestionJob, 
    SourceTextArtifact,
    ExtractionSnapshot,
    ExtractionRun,
    CardExtractionCandidate,
    CandidateType,
    CandidateStatus,
    ProcessingStatus
)
from models.card_catalog import CardCatalog

logger = logging.getLogger(__name__)

class IngestionPipeline:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.extractor = LangChainExtractor()

    async def run(self, source_id: uuid.UUID, job_id: uuid.UUID):
        """
        Executes the full Phase 3A deterministic extraction pipeline.
        Updates the job and source statuses accordingly.
        """
        job = await self.db.get(KnowledgeIngestionJob, job_id)
        source = await self.db.get(CardKnowledgeSource, source_id)
        
        if not job or not source:
            logger.error("Job or Source not found for pipeline run.")
            return

        def _log(msg: str):
            logger.info(msg)
            if job.logs is None:
                job.logs = []
            job.logs.append(f"[{datetime.utcnow().isoformat()}] {msg}")
            
        try:
            _log("Starting Phase 3A Extraction Pipeline")
            job.status = ProcessingStatus.PROCESSING
            job.started_at = datetime.utcnow()
            source.processing_status = ProcessingStatus.PROCESSING
            source.processing_started_at = datetime.utcnow()
            self.db.add(job)
            self.db.add(source)
            await self.db.commit()

            target_card = await self.db.get(CardCatalog, source.card_id)
            if not target_card:
                raise ValueError(f"Target CardCatalog {source.card_id} not found.")
            
            from .schemas import ExtractionTarget
            extraction_target = ExtractionTarget(
                card_id=str(target_card.id),
                bank_name=target_card.bank_name,
                card_name=target_card.card_name,
                network=target_card.network if target_card.network else None
            )

            # 1. Parse Text
            _log(f"Parsing document from: {source.storage_path or source.source_url}")
            
            if source.storage_path and str(source.storage_path).endswith(".pdf"):
                raw_text, pages = DocumentParser.parse_pdf(source.storage_path)
            elif source.storage_path and str(source.storage_path).endswith(".html"):
                raw_text, pages = DocumentParser.parse_html(source.storage_path)
            elif source.source_url:
                _log(f"Fetching content from URL: {source.source_url}")
                import httpx
                from bs4 import BeautifulSoup
                
                # Use a standard user-agent to prevent basic 403s
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                }
                
                async with httpx.AsyncClient() as client:
                    resp = await client.get(source.source_url, headers=headers)
                    resp.raise_for_status()
                    
                    soup = BeautifulSoup(resp.text, 'html.parser')
                    for script in soup(["script", "style", "nav", "footer"]):
                        script.decompose()
                        
                    raw_text = soup.get_text(separator="\n", strip=True)
                    pages = 1
            else:
                # Mock fallback for seeding
                _log("No valid local storage path found. Proceeding with dummy text for testing.")
                raw_text = "The annual membership fee shall be ₹999 plus taxes.\nEnjoy a massive 10% cashback on Swiggy up to ₹1500 per month."
                pages = 1
                
            _log(f"Parsed {pages} pages, {len(raw_text.split())} words.")
            
            raw_text = DocumentParser.truncate_text(raw_text)

            # 2. Store Text Artifact
            text_artifact = SourceTextArtifact(
                source_id=source.id,
                raw_text=raw_text,
                page_count=pages,
                word_count=len(raw_text.split())
            )
            self.db.add(text_artifact)
            await self.db.commit()
            _log(f"Stored SourceTextArtifact (id: {text_artifact.id})")

            # 3. Create Extraction Run
            run = ExtractionRun(
                source_id=source.id,
                target_card_id=target_card.id,
                target_card_name=f"{target_card.bank_name} {target_card.card_name}",
                model=self.extractor.model_name,
                provider=self.extractor.provider,
                prompt_version="mitc_prompt_v1",
                status=ProcessingStatus.PROCESSING
            )
            self.db.add(run)
            await self.db.commit()
            
            # 4. LLM Extraction
            _log(f"Calling LLM ({run.provider} / {run.model}) for target {extraction_target.card_name}...")
            extraction_result, raw_json, metadata = self.extractor.extract_intelligence(
                document_text=raw_text,
                target=extraction_target,
                template_name="mitc_prompt"
            )
            
            # Update run
            run.status = ProcessingStatus.COMPLETED
            run.completed_at = datetime.utcnow()
            run.tokens_used = metadata.get("tokens_used", 0)
            run.cost_estimate = metadata.get("cost_estimate", 0.0)
            self.db.add(run)

            # 5. Store Snapshot
            snapshot = ExtractionSnapshot(
                card_id=source.card_id,
                source_id=source.id,
                target_card_id=target_card.id,
                target_card_name=f"{target_card.bank_name} {target_card.card_name}",
                raw_extracted_json=extraction_result.model_dump(),
                raw_llm_response=json.loads(raw_json) if raw_json else {},
                model_name=run.model,
                prompt_version=run.prompt_version
            )
            self.db.add(snapshot)
            _log(f"Stored ExtractionSnapshot (id: {snapshot.id})")

            # 6. Generate Candidates
            from sqlmodel import select
            from rewards.models import RewardRule
            
            stmt = select(RewardRule).where(
                RewardRule.card_id == str(target_card.id),
                RewardRule.is_active == True
            )
            result = await self.db.execute(stmt)
            existing_rules = result.scalars().all()
            
            candidates = self._generate_candidates(extraction_result, source, target_card, existing_rules)
            for c in candidates:
                self.db.add(c)
                
            _log(f"Generated {len(candidates)} CardExtractionCandidates")

            # 7. Complete Job
            job.status = ProcessingStatus.COMPLETED
            job.completed_at = datetime.utcnow()
            source.processing_status = ProcessingStatus.COMPLETED
            source.processing_completed_at = datetime.utcnow()
            
            self.db.add(job)
            self.db.add(source)
            await self.db.commit()
            _log("Pipeline run completed successfully.")

        except Exception as e:
            _log(f"Pipeline failed: {str(e)}")
            job.status = ProcessingStatus.FAILED
            job.completed_at = datetime.utcnow()
            source.processing_status = ProcessingStatus.FAILED
            source.processing_error = str(e)
            
            self.db.add(job)
            self.db.add(source)
            await self.db.commit()
            logger.exception("Ingestion Pipeline Error")

    def _generate_candidates(
        self, 
        ext, 
        source,
        target_card,
        existing_rules
    ):
        from card_intelligence.models import CardExtractionCandidate, CandidateType
        candidates = []
        
        def generate_diff(candidate_type, entity_identifier, field_name, proposed_value, source_page, source_text, confidence):
            current_value = None
            published_rule_id = None
            
            if candidate_type == CandidateType.FEE_RULE:
                if field_name == "annual_fee":
                    current_value = {"value": target_card.annual_fee} if getattr(target_card, "annual_fee", None) is not None else None
                elif field_name == "joining_fee":
                    current_value = {"value": target_card.joining_fee} if getattr(target_card, "joining_fee", None) is not None else None
            elif candidate_type == CandidateType.CARD_FIELD:
                if field_name == "fee_waiver_spend_threshold":
                    current_value = {"value": target_card.fee_waiver_spend_threshold} if getattr(target_card, "fee_waiver_spend_threshold", None) is not None else None
            else:
                for r in existing_rules:
                    if getattr(r, "rule_name", None) == entity_identifier:
                        current_value = r.rule_config
                        published_rule_id = str(r.id)
                        break
            
            if current_value == proposed_value:
                return None
                
            change_type = "UPDATE" if current_value is not None else "ADD"
            
            return CardExtractionCandidate(
                card_id=source.card_id,
                candidate_type=candidate_type,
                entity_identifier=entity_identifier,
                field_name=field_name,
                current_value=current_value,
                proposed_value=proposed_value,
                change_type=change_type,
                published_rule_id=published_rule_id,
                source_id=source.id,
                source_page=source_page,
                source_text=source_text,
                confidence_score=confidence
            )

        extracted_entities = set()

        if getattr(ext, "annual_fee", None):
            c = generate_diff(CandidateType.FEE_RULE, "ANNUAL_FEE", "annual_fee", {"value": ext.annual_fee.amount}, ext.annual_fee.page, ext.annual_fee.source_chunk, 0.95)
            if c: candidates.append(c)
            
        if getattr(ext, "joining_fee", None):
            c = generate_diff(CandidateType.FEE_RULE, "JOINING_FEE", "joining_fee", {"value": ext.joining_fee.amount}, ext.joining_fee.page, ext.joining_fee.source_chunk, 0.95)
            if c: candidates.append(c)
            
        if getattr(ext, "fee_waiver", None):
            c = generate_diff(CandidateType.CARD_FIELD, "FEE_WAIVER", "fee_waiver_spend_threshold", {"value": ext.fee_waiver.spend_threshold}, ext.fee_waiver.page, ext.fee_waiver.source_chunk, 0.95)
            if c: candidates.append(c)

        for r in getattr(ext, "reward_rules", []):
            base_config = {"reward_type": "cashback", "reward_rate": r.rate}
            if getattr(r, "category", None):
                base_config["category"] = r.category.lower().strip()
            if getattr(r, "cap", None) is not None:
                base_config["max_reward"] = r.cap
                
            merchants = getattr(r, "merchants", [])
            if merchants:
                for merchant_name in merchants:
                    rule_config = base_config.copy()
                    m_name = merchant_name.lower().strip()
                    rule_config["merchant"] = m_name
                    entity_identifier = f"REWARD_MERCHANT_{m_name.upper().replace(' ', '_')}"
                    extracted_entities.add(entity_identifier)
                    
                    c = generate_diff(CandidateType.REWARD_RULE, entity_identifier, "reward_rule", rule_config, getattr(r, "page", None), getattr(r, "source_chunk", ""), 0.90)
                    if c: candidates.append(c)
            else:
                cat = getattr(r, "category", "GENERAL")
                entity_identifier = f"REWARD_CATEGORY_{cat.upper().replace(' ', '_')}"
                extracted_entities.add(entity_identifier)
                c = generate_diff(CandidateType.REWARD_RULE, entity_identifier, "reward_rule", base_config, getattr(r, "page", None), getattr(r, "source_chunk", ""), 0.90)
                if c: candidates.append(c)

        for e in getattr(ext, "exclusions", []):
            entity_identifier = f"EXCLUSION_{e.category.upper().replace(' ', '_')}"
            extracted_entities.add(entity_identifier)
            c = generate_diff(CandidateType.EXCLUSION, entity_identifier, "exclusion", {"category": e.category}, getattr(e, "page", None), getattr(e, "source_chunk", ""), 0.90)
            if c: candidates.append(c)

        for b in getattr(ext, "benefits", []):
            entity_identifier = f"BENEFIT_{b.benefit_type.upper().replace(' ', '_')}"
            extracted_entities.add(entity_identifier)
            c = generate_diff(CandidateType.BENEFIT, entity_identifier, "benefit", {"description": b.description, "uses_per_year": getattr(b, "uses_per_year", None)}, getattr(b, "page", None), getattr(b, "source_chunk", ""), 0.85)
            if c: candidates.append(c)

        for m in getattr(ext, "milestones", []):
            entity_identifier = f"MILESTONE_{int(m.spend_threshold)}"
            extracted_entities.add(entity_identifier)
            c = generate_diff(CandidateType.MILESTONE, entity_identifier, "milestone", {"spend_threshold": m.spend_threshold, "reward_description": m.reward_description}, getattr(m, "page", None), getattr(m, "source_chunk", ""), 0.85)
            if c: candidates.append(c)

        for r in existing_rules:
            if getattr(r, "rule_name", None) not in extracted_entities:
                type_map = {
                    "cashback": CandidateType.REWARD_RULE,
                    "exclusion": CandidateType.EXCLUSION,
                    "benefit": CandidateType.BENEFIT,
                    "milestone": CandidateType.MILESTONE
                }
                c_type = type_map.get(getattr(r, "rule_type", ""), CandidateType.REWARD_RULE)
                
                candidates.append(CardExtractionCandidate(
                    card_id=source.card_id,
                    candidate_type=c_type,
                    entity_identifier=getattr(r, "rule_name", "UNKNOWN"),
                    field_name=c_type.value.lower(),
                    current_value=getattr(r, "rule_config", {}),
                    proposed_value={},
                    change_type="STALE",
                    published_rule_id=str(r.id),
                    source_id=source.id,
                    source_text="Rule present in database but not found in latest extraction.",
                    confidence_score=1.0
                ))
            
        return candidates
