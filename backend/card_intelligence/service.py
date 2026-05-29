from uuid import UUID
from fastapi import UploadFile, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, desc
import logging
from typing import List
from datetime import datetime, timezone

from .models import CardDocument, DocumentIngestionJob, CardDocumentType, DocumentProcessingStatus
from .storage import LocalDocumentStorage
from models.card_catalog import CardCatalog

logger = logging.getLogger(__name__)

class CardIntelligenceService:
    def __init__(self, db: AsyncSession):
        self.db = db
        
    async def upload_document(
        self, 
        card_id: UUID, 
        document_type: CardDocumentType, 
        file: UploadFile,
        user_id: UUID
    ) -> CardDocument:
        # Validate Card
        card = await self.db.get(CardCatalog, card_id)
        if not card:
            raise HTTPException(status_code=404, detail="Card catalog entry not found")
            
        # Determine next version
        stmt = select(CardDocument).where(
            CardDocument.card_id == card_id, 
            CardDocument.document_type == document_type
        ).order_by(desc(CardDocument.document_version))
        result = await self.db.execute(stmt)
        latest_doc = result.scalars().first()
        version = (latest_doc.document_version + 1) if latest_doc else 1
        
        # Save file to storage
        storage_path, checksum = await LocalDocumentStorage.save_document(
            file=file,
            bank_name=card.bank_name,
            card_name=card.card_name,
            document_type=document_type.value,
            version=version
        )
        
        # Persist Metadata
        doc = CardDocument(
            card_id=card_id,
            document_type=document_type,
            file_name=file.filename or "unknown.pdf",
            storage_path=storage_path,
            mime_type=file.content_type or "application/pdf",
            uploaded_by=user_id,
            document_version=version,
            checksum_hash=checksum,
            processing_status=DocumentProcessingStatus.UPLOADED
        )
        self.db.add(doc)
        await self.db.commit()
        await self.db.refresh(doc)
        
        return doc

    async def list_documents(self, card_id: UUID) -> List[dict]:
        # Return dictionaries representing DocumentResponse to easily calculate is_latest_version
        stmt = select(CardDocument).where(CardDocument.card_id == card_id).order_by(desc(CardDocument.uploaded_at))
        result = await self.db.execute(stmt)
        docs = result.scalars().all()
        
        # Group by type to find latest versions
        latest_versions = {}
        for doc in docs:
            t = doc.document_type
            if t not in latest_versions or doc.document_version > latest_versions[t]:
                latest_versions[t] = doc.document_version
                
        responses = []
        for doc in docs:
            doc_dict = doc.model_dump()
            doc_dict["is_latest_version"] = (doc.document_version == latest_versions.get(doc.document_type))
            responses.append(doc_dict)
            
        return responses

    async def trigger_processing(self, document_id: UUID, user_id: UUID) -> DocumentIngestionJob:
        doc = await self.db.get(CardDocument, document_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
            
        if doc.processing_status in [DocumentProcessingStatus.QUEUED, DocumentProcessingStatus.PROCESSING]:
            raise HTTPException(status_code=400, detail="Document is already queued or processing")
            
        # Update doc status
        doc.processing_status = DocumentProcessingStatus.QUEUED
        
        # Create Job
        job = DocumentIngestionJob(
            document_id=doc.id,
            status=DocumentProcessingStatus.QUEUED,
            trigger_source="manual",
            triggered_by=user_id,
            logs=["Job manually triggered. Awaiting processing..."]
        )
        self.db.add(doc)
        self.db.add(job)
        await self.db.commit()
        await self.db.refresh(job)
        
        return job
