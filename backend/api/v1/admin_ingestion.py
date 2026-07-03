"""
Module: backend.api.v1.admin_ingestion
Responsibility: HTTP routes for the AI-Assisted Credit Card Catalog Ingestion Admin Workspace.
"""

from typing import Any
import uuid
from uuid import UUID
import shutil

import logging
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from auth.dependencies import get_current_admin_user
from auth.schemas import UserResponse
from core.database import get_db
from core.exceptions import BadRequestException, InternalServerException

logger = logging.getLogger(__name__)
from models.ingestion import (
    CardCatalogVersion,
    CardIngestionSession,
    CardIngestionField,
    CardFieldSource,
    IngestionAuditLog,
    SourceDocument,
    SourceChunk,
    ExtractionRun,
    BenchmarkRun,
)
from schemas.admin_ingestion import (
    CardIngestionSessionResponse,
    CardIngestionFieldResponse,
    SessionCreateRequest,
    FieldUpdateRequest,
    IngestionAuditLogResponse,
)

router = APIRouter()


@router.get(
    "/sessions",
    response_model=list[CardIngestionSessionResponse],
    summary="List all ingestion sessions",
)
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_admin: UserResponse = Depends(get_current_admin_user),
) -> Any:
    """Retrieve all ingestion sessions. Sorted by priority and recency."""
    # Simplified query. Real world would sort by priority enum mapping and date.
    stmt = select(CardIngestionSession).order_by(CardIngestionSession.updated_at.desc())
    result = await db.execute(stmt)
    sessions = result.scalars().all()
    return sessions


@router.post(
    "/sessions",
    response_model=CardIngestionSessionResponse,
    summary="Create a manual ingestion session",
    status_code=status.HTTP_201_CREATED,
)
async def create_session(
    request: SessionCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: UserResponse = Depends(get_current_admin_user),
) -> Any:
    """Manually create an ingestion session. Unblocks Phase 2 manual entry workflows."""
    import sentry_sdk
    sentry_sdk.set_tag("service", "ingestion")
    sentry_sdk.set_user({"id": str(current_admin.id)})
    sentry_sdk.add_breadcrumb(
        category="ingestion",
        message=f"Creating manual session for {request.bank_name} {request.card_name}",
        level="info"
    )

    session = CardIngestionSession(
        card_name=request.card_name,
        bank_name=request.bank_name,
        status="DRAFT",
        review_priority="MEDIUM",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.get(
    "/sessions/{session_id}/fields",
    response_model=list[CardIngestionFieldResponse],
    summary="List fields for a session",
)
async def list_session_fields(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: UserResponse = Depends(get_current_admin_user),
) -> Any:
    """Get all fields for a session, including their sources (for the Evidence Drawer)."""
    stmt = (
        select(CardIngestionField)
        .where(CardIngestionField.session_id == session_id)
        .options(selectinload(CardIngestionField.sources))
    )
    result = await db.execute(stmt)
    fields = result.scalars().all()
    
    # Return as response models. The `sources` relationship is loaded.
    return fields


@router.get(
    "/sessions/{session_id}/fields/{field_id}",
    response_model=CardIngestionFieldResponse,
    summary="Get single field with evidence",
)
async def get_session_field(
    session_id: UUID,
    field_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: UserResponse = Depends(get_current_admin_user),
) -> Any:
    """Get detailed evidence for a single field (Evidence API)."""
    stmt = (
        select(CardIngestionField)
        .where(
            CardIngestionField.session_id == session_id,
            CardIngestionField.id == field_id
        )
        .options(selectinload(CardIngestionField.sources))
    )
    result = await db.execute(stmt)
    field = result.scalar_one_or_none()
    
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
        
    return field


@router.patch(
    "/sessions/{session_id}/fields/{field_id}",
    response_model=CardIngestionFieldResponse,
    summary="Update a field's value or status",
)
async def update_session_field(
    session_id: UUID,
    field_id: UUID,
    request: FieldUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: UserResponse = Depends(get_current_admin_user),
) -> Any:
    """Update a field (e.g. resolve a conflict). Creates an Audit Log entry."""
    stmt = (
        select(CardIngestionField)
        .where(
            CardIngestionField.session_id == session_id,
            CardIngestionField.id == field_id
        )
        .options(selectinload(CardIngestionField.sources))
    )
    result = await db.execute(stmt)
    field = result.scalar_one_or_none()
    
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    
    # Track audit log
    audit_log = IngestionAuditLog(
        session_id=session_id,
        field_id=field_id,
        admin_user_id=current_admin.id,
        original_value=field.extracted_value,
        modified_value=request.extracted_value if request.extracted_value is not None else field.extracted_value,
        reason="Manual Edit",
    )
    db.add(audit_log)
    
    if request.extracted_value is not None:
        field.extracted_value = request.extracted_value
        field.verification_status = "MANUALLY_EDITED"
        
    if request.verification_status is not None:
        field.verification_status = request.verification_status
        
    await db.commit()
    await db.refresh(field)
    return field


@router.get(
    "/sessions/{session_id}/audit",
    response_model=list[IngestionAuditLogResponse],
    summary="Get Audit Timeline for a session",
)
async def get_session_audit_timeline(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: UserResponse = Depends(get_current_admin_user),
) -> Any:
    """Get the Git-history style audit timeline for this card session."""
    stmt = (
        select(IngestionAuditLog)
        .where(IngestionAuditLog.session_id == session_id)
        .order_by(IngestionAuditLog.timestamp.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()
class DiffResponseItem(BaseModel):
    field_name: str
    old_value: Any | None
    new_value: Any | None
    is_changed: bool

class VersionDiffResponse(BaseModel):
    card_id: UUID
    version_1: int
    version_2: int
    diffs: list[DiffResponseItem]

@router.get(
    "/catalog/{card_id}/diff",
    response_model=VersionDiffResponse,
    summary="Compare two versions of a card catalog",
)
async def get_version_diff(
    card_id: UUID,
    v1: int,
    v2: int,
    db: AsyncSession = Depends(get_db),
    current_admin: UserResponse = Depends(get_current_admin_user),
) -> Any:
    """Compare two historical versions of a card to see exactly what changed."""
    stmt = select(CardCatalogVersion).where(
        CardCatalogVersion.card_catalog_id == card_id,
        CardCatalogVersion.version_number.in_([v1, v2])
    )
    result = await db.execute(stmt)
    versions = result.scalars().all()
    
    if len(versions) != 2:
        raise HTTPException(status_code=404, detail="One or both versions not found")
        
    v1_record = next(v for v in versions if v.version_number == v1)
    v2_record = next(v for v in versions if v.version_number == v2)
    
    # Simple diffing logic
    diffs = []
    
    # Hardcoded standard fields for demonstration. In reality, we'd reflect over the model.
    standard_fields = ["annual_fee", "joining_fee", "reward_rate"]
    
    for field in standard_fields:
        old_val = getattr(v1_record, field, None)
        new_val = getattr(v2_record, field, None)
        diffs.append(DiffResponseItem(
            field_name=field,
            old_value=old_val,
            new_value=new_val,
            is_changed=(old_val != new_val)
        ))
        
    # JSONB metadata diff
    v1_meta = v1_record.benefit_metadata or {}
    v2_meta = v2_record.benefit_metadata or {}
    
    all_keys = set(v1_meta.keys()).union(set(v2_meta.keys()))
    for key in all_keys:
        old_val = v1_meta.get(key)
        new_val = v2_meta.get(key)
        diffs.append(DiffResponseItem(
            field_name=key,
            old_value=old_val,
            new_value=new_val,
            is_changed=(old_val != new_val)
        ))
        
    return VersionDiffResponse(
        card_id=card_id,
        version_1=v1,
        version_2=v2,
        diffs=diffs
    )

class BankExtractionTemplateResponse(BaseModel):
    id: UUID
    bank_name: str
    schema_mapping: dict[str, str]

class BankExtractionTemplateRequest(BaseModel):
    bank_name: str
    schema_mapping: dict[str, str]

@router.get(
    "/templates",
    response_model=list[BankExtractionTemplateResponse],
    summary="List all Bank Extraction Templates",
)
async def list_templates(
    db: AsyncSession = Depends(get_db),
    current_admin: UserResponse = Depends(get_current_admin_user),
) -> Any:
    stmt = select(BankExtractionTemplate)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post(
    "/templates",
    response_model=BankExtractionTemplateResponse,
    summary="Create or update a Bank Extraction Template",
)
async def create_template(
    request: BankExtractionTemplateRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: UserResponse = Depends(get_current_admin_user),
) -> Any:
    stmt = select(BankExtractionTemplate).where(BankExtractionTemplate.bank_name == request.bank_name)
    result = await db.execute(stmt)
    template = result.scalar_one_or_none()
    
    if template:
        # Update existing
        template.schema_mapping = request.schema_mapping
    else:
        template = BankExtractionTemplate(
            bank_name=request.bank_name,
            schema_mapping=request.schema_mapping
        )
        db.add(template)
        
    await db.commit()
    await db.refresh(template)
    return template

import os
import hashlib
from services.pdf_parser import parse_and_chunk_pdf
import time
from datetime import datetime

class SourceDocumentResponse(BaseModel):
    id: UUID
    source_type: str
    file_name: str | None
    checksum_sha256: str
    status: str
    chunks_created: int
    pages_processed: int
    uploaded_at: datetime
    
class SourceChunkResponse(BaseModel):
    id: UUID
    document_id: UUID
    page_number: int
    chunk_index: int
    chunk_text: str
    token_count: int

@router.post(
    "/sources/upload",
    response_model=SourceDocumentResponse,
    summary="Upload and parse a Source Document",
)
async def upload_source_document(
    background_tasks: BackgroundTasks,
    source_type: str,
    card_catalog_id: UUID | None = None,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_admin: UserResponse = Depends(get_current_admin_user),
) -> Any:
    # 1. Validate MIME type
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    # 2. Save file locally
    upload_dir = "data/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Stream to a temporary UUID filename first
    temp_filename = f"{uuid.uuid4()}.pdf"
    temp_file_path = os.path.join(upload_dir, temp_filename)
    
    MAX_UPLOAD_SIZE_MB = 25
    MAX_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024
    bytes_written = 0
    sha256_hash = hashlib.sha256()

    import aiofiles
    async with aiofiles.open(temp_file_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            bytes_written += len(chunk)
            if bytes_written > MAX_SIZE:
                import os
                if os.path.exists(temp_file_path):
                    os.remove(temp_file_path)
                raise HTTPException(status_code=413, detail=f"File exceeds maximum size of {MAX_UPLOAD_SIZE_MB}MB.")
            sha256_hash.update(chunk)
            await f.write(chunk)
            
    file_size = bytes_written
    checksum = sha256_hash.hexdigest()
    
    # Rename to checksum
    file_path = os.path.join(upload_dir, f"{checksum}.pdf")
    if temp_file_path != file_path:
        os.rename(temp_file_path, file_path)
        
    # 3. Create SourceDocument
    doc = SourceDocument(
        card_catalog_id=card_catalog_id,
        source_type=source_type,
        file_name=file.filename,
        checksum_sha256=checksum,
        file_size=file_size,
        status="UPLOADED"
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    
    # 3. Fire background task to parse and chunk
    background_tasks.add_task(parse_and_chunk_pdf, db, doc, file_path)
    
    return doc

def _escape_like(value: str) -> str:
    """Escape LIKE wildcard characters to prevent pattern-injection DoS."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@router.get(
    "/sources/{document_id}/search",
    response_model=list[SourceChunkResponse],
    summary="Search within a Source Document's chunks",
)
async def search_source_chunks(
    document_id: UUID,
    q: str,
    db: AsyncSession = Depends(get_db),
    current_admin: UserResponse = Depends(get_current_admin_user),
) -> Any:
    safe_q = _escape_like(q)
    stmt = (
        select(SourceChunk)
        .where(
            SourceChunk.document_id == document_id,
            SourceChunk.chunk_text.ilike(f"%{safe_q}%")
        )
        .order_by(SourceChunk.page_number)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


class ExtractFieldRequest(BaseModel):
    document_id: UUID
    field_name: str

class ExtractedFieldResponse(BaseModel):
    id: UUID
    extraction_run_id: UUID
    normalized_field_name: str
    candidate_value: dict[str, Any] | None
    source_chunk_id: UUID | None
    retrieval_score: float | None
    retrieval_rank: int | None
    explanation: str | None
    status: str
    
    # We include dynamic debug property
    retrieved_chunks_debug: list[dict[str, Any]] | None = None
    metrics_debug: dict[str, Any] | None = None

    model_config = {
        "from_attributes": True
    }

from services.ai_extraction import extract_single_field

@router.post(
    "/extract-field",
    response_model=ExtractedFieldResponse,
    summary="Extract a field from a SourceDocument using LLM",
)
async def api_extract_field(
    request: ExtractFieldRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: UserResponse = Depends(get_current_admin_user),
) -> Any:
    import sentry_sdk
    sentry_sdk.set_tag("service", "ingestion")
    sentry_sdk.set_user({"id": str(current_admin.id)})
    sentry_sdk.add_breadcrumb(
        category="ingestion",
        message=f"Extracting field {request.field_name} from doc {request.document_id}",
        level="info"
    )

    try:
        candidate = await extract_single_field(db, request.document_id, request.field_name)
        
        # Pydantic will serialize the candidate, but we need to inject the dynamic debug property
        response = ExtractedFieldResponse.model_validate(candidate)
        if hasattr(candidate, "_retrieved_chunks_debug"):
            response.retrieved_chunks_debug = candidate._retrieved_chunks_debug
        if hasattr(candidate, "_metrics_debug"):
            response.metrics_debug = candidate._metrics_debug
            
        return response
    except ValueError as e:
        logger.warning("Field extraction validation failed: %s", e)
        raise BadRequestException(message="Field extraction failed. Check the field name and document ID.")
    except Exception:
        import sentry_sdk
        sentry_sdk.capture_exception()
        raise InternalServerException()

from models.ingestion import ExtractionBenchmark

class BenchmarkCreateRequest(BaseModel):
    document_id: UUID
    field_name: str
    expected_value: dict[str, Any]

class ExtractionBenchmarkResponse(BaseModel):
    id: UUID
    document_id: UUID
    field_name: str
    expected_value: dict[str, Any] | None
    verified_by_admin: bool

@router.post(
    "/benchmarks",
    response_model=ExtractionBenchmarkResponse,
    summary="Create a ground truth benchmark from admin approval",
)
async def create_benchmark(
    request: BenchmarkCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: UserResponse = Depends(get_current_admin_user),
) -> Any:
    from models.ingestion import BenchmarkDataset
    dataset = (await db.execute(select(BenchmarkDataset).where(BenchmarkDataset.name == "Default Dataset").limit(1))).scalar_one_or_none()
    if not dataset:
        dataset = BenchmarkDataset(name="Default Dataset")
        db.add(dataset)
        await db.commit()
        await db.refresh(dataset)
        
    """Create or update ground truth for a document and field."""
    stmt = select(ExtractionBenchmark).where(
        ExtractionBenchmark.document_id == request.document_id,
        ExtractionBenchmark.field_name == request.field_name
    )
    result = await db.execute(stmt)
    benchmark = result.scalar_one_or_none()
    
    if benchmark:
        benchmark.expected_value = request.expected_value
        benchmark.verified_by_admin = True
        benchmark.dataset_id = dataset.id
    else:
        benchmark = ExtractionBenchmark(
            dataset_id=dataset.id,
            document_id=request.document_id,
            field_name=request.field_name,
            expected_value=request.expected_value,
            verified_by_admin=True
        )
        db.add(benchmark)
        
    await db.commit()
    await db.refresh(benchmark)
    return benchmark

from fastapi import BackgroundTasks
from services.benchmark_runner import process_evaluation_job
from models.ingestion import EvaluationJob, BenchmarkRun, PromptTemplate, BenchmarkDataset

@router.post(
    "/evaluation/run",
    summary="Kick off an async evaluation job",
)
async def run_evaluation_suite(
    dataset_id: UUID | None = None,
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db),
    current_admin: UserResponse = Depends(get_current_admin_user),
) -> Any:
    if dataset_id:
        dataset = await db.get(BenchmarkDataset, dataset_id)
    else:
        dataset = (await db.execute(select(BenchmarkDataset).order_by(BenchmarkDataset.created_at.desc()).limit(1))).scalar_one_or_none()
        
    if not dataset:
        raise HTTPException(status_code=400, detail="No Dataset found. Create benchmarks first.")
        
    job = EvaluationJob(dataset_id=dataset.id)
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    # Run in background
    background_tasks.add_task(process_evaluation_job, job.id)
    return {"job_id": job.id, "status": "PENDING"}

@router.get(
    "/evaluation/datasets",
    summary="Get Evaluation Datasets",
)
async def get_evaluation_datasets(
    db: AsyncSession = Depends(get_db),
    current_admin: UserResponse = Depends(get_current_admin_user),
) -> Any:
    from models.ingestion import BenchmarkDataset
    stmt = select(BenchmarkDataset).order_by(BenchmarkDataset.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get(
    "/evaluation",
    summary="Get Evaluation Dashboard Stats",
)
async def get_evaluation_dashboard(
    dataset_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_admin: UserResponse = Depends(get_current_admin_user),
) -> Any:
    """Aggregate evaluation dashboard from the admin ingestion dashboard service."""
    from services.admin_ingestion_dashboard import (
        get_active_job_progress,
        get_failure_analysis,
        get_field_accuracy,
        get_prompt_performance,
        get_system_health,
        get_worst_performers,
    )

    return {
        "health": await get_system_health(db, dataset_id),
        "field_accuracy": await get_field_accuracy(db, dataset_id),
        "prompt_performance": await get_prompt_performance(db, dataset_id),
        "failure_analysis": await get_failure_analysis(db, dataset_id),
        "worst_performers": await get_worst_performers(db, dataset_id),
        "job_progress": await get_active_job_progress(db),
    }
