"""
Module: backend.api.v1.health
Responsibility: Health check endpoint for orchestration and monitoring.

Architectural Boundaries:
- Route handler only — no business logic, no domain knowledge.
- Checks database connectivity to provide meaningful health status.
- Returns application metadata and DB status in a structured format.

Decision: Uses the canonical `get_db` from `core.database` and wraps the response
in `core.responses.SuccessResponse` for consistency across all endpoints.
The HealthResponse model is defined in `schemas.common` as a domain-agnostic schema.

Use Cases:
- Kubernetes liveness/readiness probes
- Load balancer health checks
- Monitoring dashboards (e.g., Datadog, Grafana)
"""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.config import get_settings
from core.logging import get_logger
from core.responses import SuccessResponse
from schemas.common import HealthResponse

router = APIRouter(tags=["health"])
logger = get_logger(__name__)


@router.get("/health", response_model=SuccessResponse)
async def health_check(db: AsyncSession = Depends(get_db)) -> SuccessResponse:
    """Application health check with database connectivity verification.

    Returns:
        SuccessResponse containing HealthResponse data with:
        - status: "healthy" or "degraded"
        - version: application version string
        - database: "connected" or "disconnected"

    The database connectivity check uses a lightweight `SELECT 1` query
    to avoid I/O overhead while verifying the connection is alive.
    """
    settings = get_settings()

    # Lightweight DB connectivity probe
    try:
        await db.execute(text("SELECT 1"))
        db_status = "connected"
        overall_status = "healthy"
    except Exception:
        logger.warning("Database health check failed", exc_info=True)
        db_status = "disconnected"
        overall_status = "degraded"

    return SuccessResponse(
        data=HealthResponse(
            status=overall_status,
            version=settings.app_version,
            database=db_status,
        ).model_dump(),
    )