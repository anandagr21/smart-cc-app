import asyncio
import uuid
import sys
from sqlmodel import select
from core.database import async_session_factory
from card_intelligence.models import CardKnowledgeSource
from models.card_catalog import CardCatalog
from card_intelligence.extraction.pipeline import IngestionPipeline

async def run_real_document():
    async with async_session_factory() as db:
        # Find the SimplyClick card
        stmt = select(CardCatalog).where(CardCatalog.card_name.like("%SimplyClick%"))
        result = await db.execute(stmt)
        card = result.scalars().first()
        
        if not card:
            print("SimplyClick card not found in DB.")
            return

        print(f"Target Card: {card.bank_name} {card.card_name} - {card.id}")

        # Find the knowledge source corresponding to the provided file path, or create one
        file_path = "/app/sbi_simplyclick.html"
        
        # We need a CardKnowledgeSource for this
        stmt = select(CardKnowledgeSource).where(CardKnowledgeSource.card_id == card.id)
        result = await db.execute(stmt)
        source = result.scalars().first()
        
        if not source:
            source = CardKnowledgeSource(
                card_id=card.id,
                source_type="url",
                source_url="https://www.sbicard.com/en/personal/credit-cards/simplyclick-sbi-card.html",
                storage_path=file_path,
                source_metadata={"title": "SimplyClick SBI Card"}
            )
            db.add(source)
            await db.commit()
            await db.refresh(source)
            print(f"Created new CardKnowledgeSource: {source.id}")
        else:
            # ensure storage path is correct
            source.storage_path = file_path
            db.add(source)
            await db.commit()
            print(f"Using existing CardKnowledgeSource: {source.id}")

        # We need a dummy job
        from card_intelligence.models import KnowledgeIngestionJob
        job = KnowledgeIngestionJob(
            knowledge_source_id=source.id,
            status="PROCESSING"
        )
        db.add(job)
        await db.commit()
        await db.refresh(job)
        
        # Run pipeline
        print("Starting ingestion pipeline...")
        pipeline = IngestionPipeline(db)
        await pipeline.run(source.id, job.id)
        
        # Check generated candidates
        from card_intelligence.models import CardExtractionCandidate
        stmt = select(CardExtractionCandidate).where(CardExtractionCandidate.source_id == source.id)
        result = await db.execute(stmt)
        candidates = result.scalars().all()
        
        print(f"\nGenerated {len(candidates)} candidates:")
        for c in candidates:
            print(f"[{c.change_type}] {c.candidate_type} | {c.entity_identifier} | {c.proposed_value}")

if __name__ == "__main__":
    asyncio.run(run_real_document())
