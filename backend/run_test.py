import asyncio
import uuid
import sys
import logging

from main import app  # This imports all models via the routers
from core.database import async_session_factory
from card_intelligence.extraction.pipeline import IngestionPipeline

logging.basicConfig(level=logging.INFO)

async def test_pipeline(card_id_str, source_url):
    card_id = uuid.UUID(card_id_str)
    
    async with async_session_factory() as db:
        # Create a test source
        from card_intelligence.models import CardKnowledgeSource, KnowledgeSourceType, KnowledgeIngestionJob
        source = CardKnowledgeSource(
            card_id=card_id,
            source_type=KnowledgeSourceType.URL,
            source_url=source_url,
            source_title="Test URL Source"
        )
        db.add(source)
        await db.commit()
        await db.refresh(source)
        
        # Create job
        job = KnowledgeIngestionJob(knowledge_source_id=source.id)
        db.add(job)
        await db.commit()
        await db.refresh(job)
        
        # Run pipeline
        pipeline = IngestionPipeline(db)
        print(f"Running pipeline for source {source.id}")
        await pipeline.run(source.id, job.id)
        
        # Print status
        await db.refresh(source)
        print(f"Final Status: {source.processing_status}")
        print(f"Error (if any): {source.processing_error}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python run_test.py <card_id> <url>")
        sys.exit(1)
    asyncio.run(test_pipeline(sys.argv[1], sys.argv[2]))
