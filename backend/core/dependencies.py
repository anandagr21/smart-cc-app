"""
Module: backend.core.dependencies
Responsibility: Shared FastAPI dependency helpers for cross-cutting concerns.

Architectural Boundaries:
- Pure dependency callables — no business logic, no domain awareness.
- Provides reusable Depends() functions for pagination, settings, and request metadata.
- All domain-specific deps (repos, services) remain in `api/deps.py`.

Decision: Extracting these from individual routes avoids copy-paste and ensures
consistent parameter names across all API versions.
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import Depends, Query, Request

from core.config import Settings, get_settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Settings Dependency
# ---------------------------------------------------------------------------


def get_settings_dependency() -> Settings:
    """FastAPI dependency: injects the cached Settings singleton.

    Usage:
        @router.get("/config")
        async def config(settings: Settings = Depends(get_settings_dependency)):
            return {"environment": settings.environment}
    """
    return get_settings()


# ---------------------------------------------------------------------------
# Request ID Dependency
# ---------------------------------------------------------------------------


def get_request_id(request: Request) -> str:
    """FastAPI dependency: extract the request_id from request state.

    Requires `RequestIDMiddleware` to be registered — otherwise defaults to "unknown".
    Useful for passing request_id into services or log adapters.

    Usage:
        @router.get("/items")
        async def items(request_id: str = Depends(get_request_id)):
            logger.info("Fetching items", extra={"request_id": request_id})
    """
    return getattr(request.state, "request_id", "unknown")


# ---------------------------------------------------------------------------
# Pagination Dependency
# ---------------------------------------------------------------------------


def pagination_params(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Number of records per page (max 100)"),
) -> dict[str, int]:
    """FastAPI dependency: standard pagination parameters.

    Returns a dict with `page` and `page_size` for use in repository queries.
    Validates bounds: page >= 1, 1 <= page_size <= 100.

    Usage:
        @router.get("/cards")
        async def list_cards(
            pagination: Annotated[dict[str, int], Depends(pagination_params)],
            db: AsyncSession = Depends(get_db),
        ):
            repo = CardCatalogRepository(session=db)
            cards, total = await repo.list(
                offset=(pagination["page"] - 1) * pagination["page_size"],
                limit=pagination["page_size"],
            )
    """
    return {"page": page, "page_size": page_size}