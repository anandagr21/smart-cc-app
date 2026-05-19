"""
Module: backend.schemas.common
Responsibility: Shared Pydantic schemas used across all API endpoints.

Architectural Boundaries:
- Re-exports canonical response models from `core.responses` to avoid duplication.
- Defines domain-agnostic schemas (e.g., HealthResponse) that don't belong in core.
- No business logic — pure Pydantic schema definitions.

Decision: The response envelope schemas (SingleResponse, PaginatedResponse, etc.)
are the single source of truth in `core.responses`. This module re-exports them
so existing route imports continue to work without changes.
"""

from pydantic import BaseModel, ConfigDict, Field

# Re-export canonical response models from core.responses to avoid duplication
from core.responses import (  # noqa: F401
    ErrorDetail,
    ErrorResponse as CoreErrorResponse,
    ListResponse,
    Meta,
    PaginatedResponse,
    SingleResponse,
    SuccessResponse,
)

# Backward-compatible alias for routes that import ErrorResponse from schemas.common
ErrorResponse = CoreErrorResponse


class HealthResponse(BaseModel):
    """Response schema for the health check endpoint.

    Includes application metadata and database connectivity status.
    This is kept here rather than in core because it's a domain-agnostic
    schema used solely by the health API route.
    """

    status: str = Field(..., description='"healthy" or "degraded"')
    version: str = Field(..., description="Application version.")
    database: str = Field(..., description='"connected" or "disconnected"')

    model_config = ConfigDict(extra="forbid")