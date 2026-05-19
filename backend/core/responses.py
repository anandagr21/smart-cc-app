"""
Module: backend.core.responses
Responsibility: Standard Pydantic response schemas for success and error payloads.

Architectural Boundaries:
- Pure data schemas — no logic, no I/O.
- Every API response follows the skills/api.md format.
- Domain modules import these base classes and extend with their own data types.
- These schemas serve as the single source of truth for response shapes.

Decision: Generic Pydantic models with TypeVar ensure type-safe response models
without duplicating response wrappers in every route. PaginatedResponse reuses
the meta structure defined in skills/api.md.
"""

from __future__ import annotations

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T", bound=BaseModel)


# ---------------------------------------------------------------------------
# Success Responses
# ---------------------------------------------------------------------------


class Meta(BaseModel):
    """Pagination / list metadata."""

    total: int = Field(..., ge=0, description="Total number of records.")
    page: int = Field(..., ge=1, description="Current page number (1-indexed).")
    page_size: int = Field(..., ge=1, description="Number of records per page.")
    has_next: bool = Field(..., description="Whether there are more pages after this one.")


class SingleResponse(BaseModel, Generic[T]):
    """Wraps a single resource response.

    Example:
        {
          "data": { "id": "uuid", "name": "HDFC Infinia" },
          "meta": {}
        }
    """

    data: T = Field(..., description="The requested resource.")
    meta: dict[str, object] = Field(default_factory=dict, description="Extra metadata (empty for single resources).")


class ListResponse(BaseModel, Generic[T]):
    """Wraps a paginated list response.

    Example:
        {
          "data": [ { "id": "uuid", "name": "..." } ],
          "meta": { "total": 100, "page": 1, "page_size": 20, "has_next": true }
        }
    """

    data: list[T] = Field(..., description="List of resources (empty array if no results).")
    meta: Meta = Field(..., description="Pagination metadata.")


# Backward-compatible alias for routes that use PaginatedResponse
PaginatedResponse = ListResponse


class SuccessResponse(BaseModel):
    """Generic success response for non-data endpoints (e.g., DELETE, status updates).

    Example:
        {
          "data": { "ok": true },
          "meta": {}
        }
    """

    data: dict[str, object] = Field(default_factory=lambda: {"ok": True})
    meta: dict[str, object] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Error Response
# ---------------------------------------------------------------------------


class ErrorDetail(BaseModel):
    """Structured error detail.

    Example:
        {
          "code": "CARD_NOT_FOUND",
          "message": "Credit card with ID 'xyz' was not found.",
          "details": {}
        }
    """

    code: str = Field(..., description="Machine-readable error code (SCREAMING_SNAKE_CASE).")
    message: str = Field(..., description="Human-readable error description.")
    details: dict[str, Any] = Field(default_factory=dict, description="Additional context (validation errors, etc.).")


class ErrorResponse(BaseModel):
    """Standard error response envelope.

    This is the reference schema for error responses but is NOT typically used
    as a return type in routes — instead, FastAPI exception handlers in
    `exceptions.py` render this shape via JSONResponse.
    """

    error: ErrorDetail

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Resource with ID 'xyz' was not found.",
                    "details": {},
                }
            }
        }
    )