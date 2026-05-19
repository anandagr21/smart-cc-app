"""
Module: backend.schemas.common
Responsibility: Shared Pydantic schemas used across all API endpoints.

Architectural Boundaries:
- DRY principle: common pagination, health, and response wrapper models.
- Used by route handlers to type responses consistently.
- No business logic — pure Pydantic schema definitions.

Decision: Standard wrapper types (`PaginatedResponse`, `HealthResponse`) ensure
every endpoint returns the same envelope shape. This is the foundation for
the API response format defined in skills/api.md.
"""

from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard paginated list response wrapper.

    Used by all list endpoints. The `meta` block provides pagination context
    per skills/api.md conventions.
    """

    data: list[T] = Field(default_factory=list, description="List of items for the current page.")
    meta: dict = Field(
        default_factory=lambda: {
            "total": 0,
            "page": 1,
            "page_size": 20,
            "has_next": False,
        },
        description="Pagination metadata.",
    )

    model_config = ConfigDict(extra="forbid")


class SingleResponse(BaseModel, Generic[T]):
    """Standard single-resource response wrapper.

    Used for GET single resource, POST create, PUT/PATCH update responses.
    """

    data: T = Field(..., description="The resource data.")
    meta: dict = Field(default_factory=dict, description="Optional metadata.")

    model_config = ConfigDict(extra="forbid")


class ErrorResponse(BaseModel):
    """Standard error response shape.

    Matches the error format from skills/api.md:
    { "error": { "code": "...", "message": "...", "details": {} } }
    """

    code: str = Field(..., description="Machine-readable error code (SCREAMING_SNAKE_CASE).")
    message: str = Field(..., description="Human-readable error message.")
    details: dict = Field(default_factory=dict, description="Optional error context.")

    model_config = ConfigDict(extra="forbid")


class HealthResponse(BaseModel):
    """Response for the health check endpoint.

    Includes application metadata and database connectivity status.
    """

    status: str = Field(..., description='"healthy" or "degraded"')
    version: str = Field(..., description="Application version.")
    database: str = Field(..., description='"connected" or "disconnected"')

    model_config = ConfigDict(extra="forbid")