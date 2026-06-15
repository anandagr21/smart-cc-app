import asyncio
import traceback
from datetime import datetime
from uuid import UUID
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import async_session_factory
from models.ingestion import (
    EvaluationJob, 
    BenchmarkDataset, 
    ExtractionBenchmark, 
    BenchmarkRun,
    ExtractionRun,
    BenchmarkErrorReason,
    PromptTemplate
)
from services.ai_extraction import extract_single_field, _retrieve_chunks
from services.evaluators import get_evaluator

async def process_evaluation_job(job_id: UUID) -> None:
    """Background task to run an evaluation job asynchronously."""
    async with async_session_factory() as db:
        # 1. Fetch Job and lock Dataset
        job = await db.get(EvaluationJob, job_id)
        if not job:
            return
            
        dataset = await db.get(BenchmarkDataset, job.dataset_id)
        if not dataset:
            job.status = "FAILED"
            await db.commit()
            return
            
        # Lock dataset
        dataset.status = "EVALUATING"
        
        # Mark job as running
        job.status = "RUNNING"
        job.started_at = datetime.utcnow()
        await db.commit()
        
        # Fetch benchmarks
        stmt = select(ExtractionBenchmark).where(ExtractionBenchmark.dataset_id == dataset.id)
        result = await db.execute(stmt)
        benchmarks = result.scalars().all()
        
        job.total_benchmarks = len(benchmarks)
        await db.commit()
        
        try:
            # 2. Process each benchmark
            for benchmark in benchmarks:
                try:
                    # Capture retrieved chunks for snapshot
                    retrieved_chunks = await _retrieve_chunks(db, benchmark.document_id, benchmark.field_name)
                    chunks_snapshot = []
                    for rank, c in enumerate(retrieved_chunks, 1):
                        chunks_snapshot.append({
                            "chunk_id": str(c.id),
                            "rank": rank,
                            "page": c.page_number
                        })
                
                    # Extract
                    candidate = await extract_single_field(
                        db=db,
                        document_id=benchmark.document_id,
                        field_name=benchmark.field_name
                    )
                    
                    # Fetch extraction run to get prompt_template_id
                    # (candidate.extraction_run_id is created in extract_single_field)
                    extraction_run = None
                    prompt_template_version = None
                    if candidate and candidate.extraction_run_id:
                        extraction_run = await db.get(ExtractionRun, candidate.extraction_run_id)
                    
                    if extraction_run and extraction_run.prompt_template_id:
                        prompt_template = await db.get(PromptTemplate, extraction_run.prompt_template_id)
                        if prompt_template:
                            prompt_template_version = prompt_template.version
                        
                    prompt_template_id = extraction_run.prompt_template_id if extraction_run else None
                    
                    # Evaluate
                    evaluator = get_evaluator(benchmark.field_name)
                    
                    candidate_value = candidate.candidate_value if candidate else None
                    expected_value = benchmark.expected_value
                    
                    # Default empty expected dict if None for strict eval safety
                    if expected_value is None:
                        expected_value = {}
                        
                    eval_result = evaluator.evaluate(expected_value, candidate_value)
                    
                    # Map error reason to failure severity
                    severity = None
                    if eval_result.error_reason:
                        if eval_result.error_reason == BenchmarkErrorReason.PARTIAL_MATCH:
                            severity = "LOW"
                        elif eval_result.error_reason == BenchmarkErrorReason.NO_VALUE_FOUND:
                            severity = "MEDIUM"
                        else:
                            severity = "HIGH"
                            
                    # Determine correct chunk found
                    # If score > 0, it means it found it successfully, so the retrieved chunks must have contained it.
                    correct_chunk_found = None
                    if eval_result.score > 0.0:
                        correct_chunk_found = True
                    elif eval_result.error_reason == BenchmarkErrorReason.NO_VALUE_FOUND:
                        # If no value found, could be retrieval failure. We mark it False for now if the chunk wasn't there.
                        # Ideally, a human sets this. But we can default to False if extraction failed completely to find it.
                        correct_chunk_found = False
                    
                    # 3. Save BenchmarkRun Snapshot
                    b_run = BenchmarkRun(
                        benchmark_id=benchmark.id,
                        dataset_id=dataset.id,
                        field_name=benchmark.field_name,
                        prompt_template_id=prompt_template_id,
                        prompt_template_version=prompt_template_version,
                        extraction_run_id=candidate.extraction_run_id if candidate else None,
                        expected_value=expected_value,
                        actual_value=candidate_value,
                        candidate_value=candidate_value,
                        retrieved_chunks_snapshot=chunks_snapshot,
                        correct_chunk_found=correct_chunk_found,
                        score=eval_result.score,
                        evaluator_version=evaluator.version,
                        error_reason=eval_result.error_reason,
                        failure_severity=severity
                    )
                    db.add(b_run)
                    
                    job.completed_benchmarks += 1
                    await db.commit()
                    
                except Exception as e:
                    print(f"Error processing benchmark {benchmark.id}: {e}")
                    traceback.print_exc()
                    b_run = BenchmarkRun(
                        benchmark_id=benchmark.id,
                        dataset_id=dataset.id,
                        field_name=benchmark.field_name,
                        expected_value=benchmark.expected_value,
                        score=0.0,
                        error_reason=BenchmarkErrorReason.EXTRACTION_FAILURE,
                        failure_severity="HIGH"
                    )
                    db.add(b_run)
                    job.completed_benchmarks += 1
                    await db.commit()
                    
            # 4. Job Completed
            job.status = "COMPLETED"
            job.completed_at = datetime.utcnow()
            dataset.status = "LOCKED"
            await db.commit()
            
        except Exception as outer_e:
            job.status = "FAILED"
            job.completed_at = datetime.utcnow()
            dataset.status = "DRAFT"
            await db.commit()
