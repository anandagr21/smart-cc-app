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
            candidates = self._generate_candidates(extraction_result, source)
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
        ext: CardIntelligenceExtraction, 
        source: CardKnowledgeSource
    ) -> List[CardExtractionCandidate]:
        candidates = []
        
        # Annual Fee
        if ext.annual_fee:
            candidates.append(CardExtractionCandidate(
                card_id=source.card_id,
                candidate_type=CandidateType.FEE_RULE,
                entity_identifier="ANNUAL_FEE",
                field_name="annual_fee",
                proposed_value={"value": ext.annual_fee.amount},
                source_id=source.id,
                source_page=ext.annual_fee.page,
                source_text=ext.annual_fee.source_chunk,
                confidence_score=0.95
            ))
            
        # Joining Fee
        if ext.joining_fee:
            candidates.append(CardExtractionCandidate(
                card_id=source.card_id,
                candidate_type=CandidateType.FEE_RULE,
                entity_identifier="JOINING_FEE",
                field_name="joining_fee",
                proposed_value={"value": ext.joining_fee.amount},
                source_id=source.id,
                source_page=ext.joining_fee.page,
                source_text=ext.joining_fee.source_chunk,
                confidence_score=0.95
            ))
            
        # Fee Waiver
        if ext.fee_waiver:
            candidates.append(CardExtractionCandidate(
                card_id=source.card_id,
                candidate_type=CandidateType.CARD_FIELD,
                entity_identifier="FEE_WAIVER",
                field_name="fee_waiver_spend_threshold",
                proposed_value={"value": ext.fee_waiver.spend_threshold},
                source_id=source.id,
                source_page=ext.fee_waiver.page,
                source_text=ext.fee_waiver.source_chunk,
                confidence_score=0.95
            ))

        # Reward Rules
        for r in ext.reward_rules:
            candidates.append(CardExtractionCandidate(
                card_id=source.card_id,
                candidate_type=CandidateType.REWARD_RULE,
                entity_identifier=r.category.upper().replace(" ", "_"),
                field_name="reward_rate",
                proposed_value={"rate": r.rate, "cap": r.cap},
                source_id=source.id,
                source_page=r.page,
                source_text=r.source_chunk,
                confidence_score=0.90
            ))

        # Exclusions
        for e in ext.exclusions:
            candidates.append(CardExtractionCandidate(
                card_id=source.card_id,
                candidate_type=CandidateType.EXCLUSION,
                entity_identifier=e.category.upper().replace(" ", "_"),
                field_name="exclusion",
                proposed_value={"category": e.category},
                source_id=source.id,
                source_page=e.page,
                source_text=e.source_chunk,
                confidence_score=0.90
            ))

        # Benefits
        for b in ext.benefits:
            candidates.append(CardExtractionCandidate(
                card_id=source.card_id,
                candidate_type=CandidateType.BENEFIT,
                entity_identifier=b.benefit_type.upper().replace(" ", "_"),
                field_name="benefit",
                proposed_value={"description": b.description, "uses_per_year": b.uses_per_year},
                source_id=source.id,
                source_page=b.page,
                source_text=b.source_chunk,
                confidence_score=0.85
            ))

        # Milestones
        for m in ext.milestones:
            candidates.append(CardExtractionCandidate(
                card_id=source.card_id,
                candidate_type=CandidateType.MILESTONE,
                entity_identifier=f"MILESTONE_{int(m.spend_threshold)}",
                field_name="milestone",
                proposed_value={"spend_threshold": m.spend_threshold, "reward_description": m.reward_description},
                source_id=source.id,
                source_page=m.page,
                source_text=m.source_chunk,
                confidence_score=0.85
            ))
            
        return candidates
