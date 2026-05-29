import asyncio
import uuid
import sys
import os

# Add backend to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from core.database import async_session_factory
from card_intelligence.extraction.pipeline import IngestionPipeline
from card_intelligence.models import CardKnowledgeSource, KnowledgeIngestionJob

async def main():
    source_id = uuid.UUID('a2871f95-9a17-495f-a0e8-14a4befc11b2')
    
    async with async_session_factory() as db:
        # Create a dummy job
        job = KnowledgeIngestionJob(knowledge_source_id=source_id)
        db.add(job)
        await db.commit()
        await db.refresh(job)
        
        print(f"Created job {job.id}, running pipeline...")
        pipeline = IngestionPipeline(db)
        await pipeline.run(source_id, job.id)
        print("Done!")

if __name__ == "__main__":
    asyncio.run(main())
