"""
Module: backend.services.admin_ingestion_dashboard
Responsibility: Query aggregation for the admin evaluation dashboard.

Extracted from api/v1/admin_ingestion.py to keep routes thin.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, Integer, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.ingestion import (
    BenchmarkDataset,
    BenchmarkRun,
    EvaluationJob,
    ExtractionBenchmark,
    ExtractionRun,
    PromptTemplate,
)


async def get_system_health(
    db: AsyncSession,
    dataset_id: UUID | None = None,
) -> dict:
    """Aggregate system health metrics: accuracy, precision, latency, cost."""
    dataset_filter, bench_dataset_filter = _build_filters(db, dataset_id)

    # Total benchmarks
    total_result = await db.execute(
        select(func.count(ExtractionBenchmark.id)).where(*bench_dataset_filter)
    )
    total_benchmarks = total_result.scalar() or 0

    # Overall accuracy
    avg_score_result = await db.execute(
        select(func.avg(BenchmarkRun.score)).where(*dataset_filter)
    )
    avg_score = avg_score_result.scalar()
    overall_accuracy = float(avg_score) if avg_score is not None else 0.0

    # Retrieval precision
    ret_result = await db.execute(
        select(
            func.sum(func.cast(BenchmarkRun.correct_chunk_found == True, Integer)),
            func.count(BenchmarkRun.id),
        ).where(BenchmarkRun.correct_chunk_found != None, *dataset_filter)
    )
    ret_row = ret_result.one_or_none()
    retrieval_precision = 0.0
    if ret_row and ret_row[1] > 0:
        retrieval_precision = float(ret_row[0] or 0) / float(ret_row[1])

    # Extraction accuracy given correct retrieval
    ext_result = await db.execute(
        select(func.avg(BenchmarkRun.score)).where(
            BenchmarkRun.correct_chunk_found == True, *dataset_filter
        )
    )
    ext_val = ext_result.scalar()
    extraction_accuracy_given_retrieval = float(ext_val) if ext_val is not None else 0.0

    # Weighted accuracy (average of per-field averages)
    field_avg_subq = (
        select(
            BenchmarkRun.field_name,
            func.avg(BenchmarkRun.score).label("avg_field_score"),
        )
        .where(*dataset_filter)
        .group_by(BenchmarkRun.field_name)
        .subquery()
    )
    weighted_result = await db.execute(
        select(func.avg(field_avg_subq.c.avg_field_score))
    )
    weighted_val = weighted_result.scalar()
    weighted_accuracy = float(weighted_val) if weighted_val is not None else 0.0

    # System metrics from ExtractionRun
    sys_result = await db.execute(
        select(
            func.avg(ExtractionRun.latency_ms),
            func.avg(ExtractionRun.cost_usd),
        )
        .select_from(BenchmarkRun)
        .join(ExtractionRun, BenchmarkRun.extraction_run_id == ExtractionRun.id)
        .where(*dataset_filter)
    )
    sys_row = sys_result.one_or_none()
    avg_latency = float(sys_row[0]) if sys_row and sys_row[0] is not None else 0.0
    avg_cost = float(sys_row[1]) if sys_row and sys_row[1] is not None else 0.0

    return {
        "total_benchmarks": total_benchmarks,
        "overall_accuracy": overall_accuracy,
        "weighted_accuracy": weighted_accuracy,
        "retrieval_precision": retrieval_precision,
        "extraction_accuracy_given_retrieval": extraction_accuracy_given_retrieval,
        "avg_latency_ms": avg_latency,
        "avg_cost_usd": avg_cost,
    }


async def get_field_accuracy(
    db: AsyncSession,
    dataset_id: UUID | None = None,
) -> list[dict]:
    """Per-field accuracy breakdown."""
    dataset_filter, _ = _build_filters(db, dataset_id)

    result = await db.execute(
        select(
            BenchmarkRun.field_name,
            func.count(BenchmarkRun.id),
            func.avg(BenchmarkRun.score),
        )
        .where(*dataset_filter)
        .group_by(BenchmarkRun.field_name)
    )
    return [
        {
            "field_name": row[0] or "Unknown",
            "count": int(row[1]),
            "accuracy": float(row[2]) if row[2] is not None else 0.0,
        }
        for row in result.all()
    ]


async def get_prompt_performance(
    db: AsyncSession,
    dataset_id: UUID | None = None,
) -> list[dict]:
    """Prompt version performance trend."""
    dataset_filter, _ = _build_filters(db, dataset_id)

    result = await db.execute(
        select(
            PromptTemplate.name,
            BenchmarkRun.prompt_template_version,
            func.avg(BenchmarkRun.score),
        )
        .select_from(BenchmarkRun)
        .join(PromptTemplate, BenchmarkRun.prompt_template_id == PromptTemplate.id)
        .where(*dataset_filter)
        .group_by(PromptTemplate.name, BenchmarkRun.prompt_template_version)
        .order_by(PromptTemplate.name, BenchmarkRun.prompt_template_version)
    )
    return [
        {
            "prompt_name": f"{row[0]}_{row[1]}",
            "accuracy": float(row[2]) if row[2] is not None else 0.0,
        }
        for row in result.all()
    ]


async def get_failure_analysis(
    db: AsyncSession,
    dataset_id: UUID | None = None,
) -> list[dict]:
    """Failure breakdown by error reason and severity."""
    dataset_filter, _ = _build_filters(db, dataset_id)

    result = await db.execute(
        select(
            BenchmarkRun.error_reason,
            BenchmarkRun.failure_severity,
            func.count(BenchmarkRun.id),
        )
        .where(BenchmarkRun.error_reason != None, *dataset_filter)
        .group_by(BenchmarkRun.error_reason, BenchmarkRun.failure_severity)
        .order_by(func.count(BenchmarkRun.id).desc())
    )
    return [
        {
            "error_reason": row[0],
            "severity": row[1],
            "count": int(row[2]),
        }
        for row in result.all()
    ]


async def get_worst_performers(
    db: AsyncSession,
    dataset_id: UUID | None = None,
) -> list[dict]:
    """Bottom 10 worst-performing benchmarks."""
    dataset_filter, _ = _build_filters(db, dataset_id)

    result = await db.execute(
        select(
            ExtractionBenchmark.field_name,
            ExtractionBenchmark.document_id,
            BenchmarkRun.score,
            BenchmarkRun.error_reason,
            BenchmarkRun.failure_severity,
            BenchmarkRun.benchmark_id,
        )
        .select_from(BenchmarkRun)
        .join(ExtractionBenchmark, BenchmarkRun.benchmark_id == ExtractionBenchmark.id)
        .where(BenchmarkRun.score < 1.0, *dataset_filter)
        .order_by(BenchmarkRun.score.asc())
        .limit(10)
    )
    return [
        {
            "field_name": row[0],
            "document_id": str(row[1]),
            "score": float(row[2]) if row[2] is not None else 0.0,
            "error_reason": row[3],
            "severity": row[4],
            "benchmark_id": str(row[5]),
        }
        for row in result.all()
    ]


async def get_active_job_progress(db: AsyncSession) -> dict | None:
    """Current evaluation job progress, if any."""
    result = await db.execute(
        select(EvaluationJob)
        .where(EvaluationJob.status.in_(["PENDING", "RUNNING"]))
        .order_by(EvaluationJob.created_at.desc())
        .limit(1)
    )
    job = result.scalar_one_or_none()
    if job:
        return {
            "status": job.status,
            "completed": job.completed_benchmarks,
            "total": job.total_benchmarks,
        }
    return None


async def _build_filters(
    db: AsyncSession, dataset_id: UUID | None
) -> tuple[list, list]:
    """Resolve dataset filters once for all dashboard queries."""
    dataset_filter = []
    bench_dataset_filter = []

    if dataset_id:
        dataset_filter.append(BenchmarkRun.dataset_id == dataset_id)
        bench_dataset_filter.append(ExtractionBenchmark.dataset_id == dataset_id)
    else:
        dataset = (
            await db.execute(
                select(BenchmarkDataset)
                .order_by(BenchmarkDataset.created_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        if dataset:
            dataset_filter.append(BenchmarkRun.dataset_id == dataset.id)
            bench_dataset_filter.append(ExtractionBenchmark.dataset_id == dataset.id)

    return dataset_filter, bench_dataset_filter
