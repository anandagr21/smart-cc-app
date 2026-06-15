import hashlib
import time
from sqlalchemy.ext.asyncio import AsyncSession
from models.ingestion import SourceDocument, SourceChunk

async def parse_and_chunk_markdown(
    db: AsyncSession, 
    document: SourceDocument, 
    markdown_text: str
) -> SourceDocument:
    """
    Parses raw markdown/HTML text, chunks it by paragraph grouping up to ~500 words,
    and saves SourceChunks. Updates the SourceDocument with metrics.
    """
    document.status = "PROCESSING"
    await db.commit()

    start_time = time.time()
    chunks_created = 0

    try:
        # Split by paragraphs
        paragraphs = [p.strip() for p in markdown_text.split('\n\n') if p.strip()]
        
        current_chunk_words = []
        current_word_count = 0
        chunk_texts = []
        
        # Group paragraphs to approx 500 words
        for paragraph in paragraphs:
            words = paragraph.split()
            word_count = len(words)
            
            if current_word_count + word_count > 500 and current_chunk_words:
                chunk_texts.append(" ".join(current_chunk_words))
                current_chunk_words = words
                current_word_count = word_count
            else:
                current_chunk_words.extend(words)
                current_word_count += word_count
                
        if current_chunk_words:
            chunk_texts.append(" ".join(current_chunk_words))
            
        for chunk_text in chunk_texts:
            token_count = len(chunk_text.split())
            chunk_hash = hashlib.sha256(chunk_text.encode('utf-8')).hexdigest()
            
            chunk = SourceChunk(
                document_id=document.id,
                page_number=1,  # HTML doesn't have native pages
                chunk_index=chunks_created,
                chunk_text=chunk_text,
                token_count=token_count,
                checksum=chunk_hash
            )
            db.add(chunk)
            chunks_created += 1
            
        document.status = "PROCESSED"
        document.chunks_created = chunks_created
        document.pages_processed = 1
        document.page_count = 1
        document.processing_time_ms = int((time.time() - start_time) * 1000)
        
        await db.commit()
        await db.refresh(document)
        
    except Exception as e:
        document.status = "FAILED"
        await db.commit()
        raise e

    return document
