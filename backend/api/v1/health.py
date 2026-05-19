"""
Module: backend.api.v1.health
Responsibility: Health check endpoint for monitoring and orchestration.

Architectural Boundaries:
- Route handler only — no business logic, no domain knowledge.
- Checks database connectivity to provide a meaningful health status.
- Returns application version for deployment tracking.

Decision: A health endpoint at /api/v1/health is essential for Kubernetes
liveness/readiness probes, load balancer health checks, and monitoring
dashboards. It verifies the database connection to catch infrastructure
issues early.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db
from core.config import get_settings
from core.logging import get_logger
from schemas.common import HealthResponse

router = APIRouter(tags=["health"])
logger = get_logger(__name__)


@router.get("/health", response_model=HealthResponse)
async def health_check(db: AsyncSession = Depends(get_db)) -> HealthResponse:
    """Application health check with database connectivity verification.

    Returns:
        HealthResponse with status ("healthy"/"degraded"), version, and DB status.

    Used by:
        - Kubernetes liveness/readiness probes
        - Load balancer health checks
        - Monitoring dashboards (e.g., Datadog, Grafana)
    """
    settings = get_settings()

    # Test database connectivity with a lightweight query
    try:
        await db.execute(text("SELECT 1"))
        db_status = "connected"
        overall_status = "healthy"
    except Exception:
        logger.warning("Database health check failed", exc_info=True)
        db_status = "disconnected"
        overall_status = "degraded"

    return HealthResponse(
        status=overall_status,
        version=settings.app_version,
        database=db_status,
    )