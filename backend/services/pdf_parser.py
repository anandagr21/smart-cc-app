import hashlib
import os
import fitz  # PyMuPDF
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from models.ingestion import SourceDocument, SourceChunk

async def parse_and_chunk_pdf(
    db: AsyncSession, 
    document: SourceDocument, 
    file_path: str
) -> SourceDocument:
    """
    Parses a PDF file using PyMuPDF, chunks it page by page, and saves SourceChunks.
    Updates the SourceDocument with metrics.
    """
    if not os.path.exists(file_path):
        document.status = "FAILED"
        await db.commit()
        raise FileNotFoundError(f"File not found: {file_path}")
    
    document.status = "PROCESSING"
    await db.commit()

    import time
    start_time = time.time()
    
    chunks_created = 0
    pages_processed = 0

    try:
        pdf_document = fitz.open(file_path)
        pages_processed = len(pdf_document)
        
        for page_num in range(pages_processed):
            page = pdf_document.load_page(page_num)
            text = page.get_text("text").strip()
            
            if text:
                # Basic token approximation (words)
                token_count = len(text.split())
                chunk_hash = hashlib.sha256(text.encode('utf-8')).hexdigest()
                
                chunk = SourceChunk(
                    document_id=document.id,
                    page_number=page_num + 1,  # 1-indexed
                    chunk_index=chunks_created,
                    chunk_text=text,
                    token_count=token_count,
                    checksum=chunk_hash
                )
                db.add(chunk)
                chunks_created += 1
                
        document.status = "PROCESSED"
        document.chunks_created = chunks_created
        document.pages_processed = pages_processed
        document.page_count = pages_processed
        document.processing_time_ms = int((time.time() - start_time) * 1000)
        
        await db.commit()
        await db.refresh(document)
        
    except Exception as e:
        document.status = "FAILED"
        await db.commit()
        raise e
        
    finally:
        if 'pdf_document' in locals():
            pdf_document.close()

    return document
