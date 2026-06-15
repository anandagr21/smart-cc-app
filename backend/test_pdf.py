import asyncio
import os
import sys

# Ensure backend path is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import async_session_factory
from models.ingestion import SourceDocument, SourceChunk
from sqlalchemy import select
from services.pdf_parser import parse_and_chunk_pdf
import hashlib

async def main():
    file_path = "backend/data/uploads/real-test-mitc.pdf"
    with open(file_path, "rb") as f:
        contents = f.read()
    checksum = hashlib.sha256(contents).hexdigest()
    
    async with async_session_factory() as db:
        # Create doc
        doc = SourceDocument(
            source_type="MITC_PDF",
            file_name="axis-atlas.pdf",
            checksum_sha256=checksum,
            file_size=len(contents),
            status="UPLOADED"
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        
        print(f"Doc created: {doc.id}")
        
        # Parse
        await parse_and_chunk_pdf(db, doc, file_path)
        print(f"Chunks created: {doc.chunks_created}")
        
        # Test Search
        print("\n--- Search: Annual Fee ---")
        stmt = select(SourceChunk).where(
            SourceChunk.document_id == doc.id,
            SourceChunk.chunk_text.ilike("%annual fee%")
        ).order_by(SourceChunk.page_number)
        
        results = await db.execute(stmt)
        chunks = results.scalars().all()
        for c in chunks:
            print(f"Page {c.page_number} ({c.token_count} tokens): {c.chunk_text[:150]}...")
            
        print("\n--- Search: Lounge ---")
        stmt = select(SourceChunk).where(
            SourceChunk.document_id == doc.id,
            SourceChunk.chunk_text.ilike("%lounge%")
        ).order_by(SourceChunk.page_number)
        
        results = await db.execute(stmt)
        chunks = results.scalars().all()
        for c in chunks:
            print(f"Page {c.page_number} ({c.token_count} tokens): {c.chunk_text[:150]}...")

if __name__ == "__main__":
    asyncio.run(main())
