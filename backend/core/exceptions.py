"""
Module: backend.core.exceptions
Responsibility: Application-wide exception hierarchy and FastAPI exception handlers.

Architectural Boundaries:
- Pure exception classes — no I/O, no database, no network access.
- FastAPI exception handlers are registered here but leverage `responses.py` for formatting.
- Every exception carries an error code and HTTP status for consistent responses.
- Domain-specific exceptions should subclass `AppException`, not FastAPI's HTTPException.

Decision: A unified exception hierarchy ensures every error response follows the
skills/api.md format: { "error": { "code": "...", "message": "...", "details": {} } }.
Domain modules define their own exceptions by subclassing `AppException`.
"""

from __future__ import annotations

import logging
from typing import Any

from starlette.requests import Request

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Base Application Exception
# ---------------------------------------------------------------------------


class AppException(Exception):
    """Base exception for all application-level errors.

    Subclasses define `status_code` and `code` to produce consistent error responses.
    All unhandled `AppException` instances are caught by the global handler and
    rendered via the standard error response schema.

    Attributes:
        message: Human-readable error description.
        code: Machine-readable error code (SCREAMING_SNAKE_CASE).
        status_code: HTTP status code to return.
        details: Optional dict of additional context (e.g., validation errors).
    """

    status_code: int = 500
    code: str = "INTERNAL_ERROR"

    def __init__(
        self,
        message: str = "An unexpected error occurred.",
        *,
        code: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.message = message
        if code is not None:
            self.code = code
        self.details = details or {}
        super().__init__(message)


# ---------------------------------------------------------------------------
# 4xx Client Errors
# ---------------------------------------------------------------------------


class BadRequestException(AppException):
    """Generic 400 — invalid input or malformed request."""

    status_code = 400
    code = "INVALID_INPUT"


class ValidationException(AppException):
    """422 — Pydantic validation failure."""

    status_code = 422
    code = "VALIDATION_ERROR"


class UnauthorizedException(AppException):
    """401 — missing or invalid authentication credentials."""

    status_code = 401
    code = "UNAUTHORIZED"


class ForbiddenException(AppException):
    """403 — authenticated but insufficient permissions."""

    status_code = 403
    code = "FORBIDDEN"


class NotFoundException(AppException):
    """404 — requested resource does not exist."""

    status_code = 404
    code = "NOT_FOUND"


class ConflictException(AppException):
    """409 — duplicate resource or state conflict."""

    status_code = 409
    code = "CONFLICT"


# ---------------------------------------------------------------------------
# 5xx Server Errors
# ---------------------------------------------------------------------------


class InternalServerException(AppException):
    """500 — unexpected server error (never expose details to client in production)."""

    status_code = 500
    code = "INTERNAL_ERROR"

    def __init__(
        self,
        message: str = "An unexpected error occurred. Please try again later.",
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message, details=details)


class ServiceUnavailableException(AppException):
    """503 — upstream service or database unavailable."""

    status_code = 503
    code = "SERVICE_UNAVAILABLE"


# ---------------------------------------------------------------------------
# Infrastructure Exceptions
# ---------------------------------------------------------------------------


class DatabaseException(AppException):
    """Raised when a database operation fails unexpectedly.

    Not for routine not-found cases — use NotFoundException for those.
    """

    status_code = 500
    code = "DATABASE_ERROR"


class ConfigurationException(AppException):
    """Raised at startup when required configuration is missing or invalid.

    This is fatal — the application should not start.
    """

    status_code = 500
    code = "CONFIGURATION_ERROR"


# ---------------------------------------------------------------------------
# FastAPI Exception Handlers
# ---------------------------------------------------------------------------


async def app_exception_handler(request: Request, exc: AppException) -> Any:
    """Handle all AppException subclasses and render a standard error response.

    Logs warnings for client errors (4xx) and errors for server errors (5xx).
    Does NOT return a Response directly — returns a dict that FastAPI serializes
    as JSON. This allows the response_model in routes to remain consistent.

    Args:
        request: The incoming Starlette request.
        exc: The caught AppException instance.

    Returns:
        A dict structured as { "error": { "code": ..., "message": ..., "details": ... } }.
    """
    from fastapi.responses import JSONResponse

    log = logger.warning if exc.status_code < 500 else logger.error
    log(
        exc.message,
        extra={
            "error_code": exc.code,
            "status_code": exc.status_code,
            "path": request.url.path,
            "method": request.method,
        },
        exc_info=exc.status_code >= 500,
    )

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            },
        },
    )


async def pydantic_validation_handler(request: Request, exc: Exception) -> Any:
    """Handle Pydantic RequestValidationError and render a standard error response.

    Maps FastAPI's built-in validation errors to the VALIDATION_ERROR code
    and 422 status, matching our standard error format.

    Args:
        request: The incoming Starlette request.
        exc: The caught RequestValidationError exception.

    Returns:
        A JSONResponse with standard error shape.
    """
    from fastapi import RequestValidationError
    from fastapi.responses import JSONResponse

    if isinstance(exc, RequestValidationError):
        # Normalize FastAPI validation errors to a list of field-level messages
        details: list[dict[str, object]] = []
        for error in exc.errors():
            loc = " -> ".join(str(part) for part in error["loc"])
            details.append({
                "field": loc,
                "message": error.get("msg", "Invalid value"),
                "type": error.get("type", "unknown"),
            })

        logger.warning(
            "Request validation failed",
            extra={
                "path": request.url.path,
                "method": request.method,
                "validation_errors": len(details),
            },
        )

        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Request validation failed. Check the details for field-level errors.",
                    "details": {"errors": details},
                },
            },
        )

    # Fallback — shouldn't be reached but safe
    logger.error("Unhandled exception in validation handler", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred.",
                "details": {},
            },
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> Any:
    """Catch-all handler for unexpected (non-AppException) exceptions.

    Logs the full traceback server-side but returns a sanitised 500 to the client.
    Never leaks internal error details in production.

    Args:
        request: The incoming Starlette request.
        exc: The unhandled exception.

    Returns:
        A JSONResponse with a sanitised error.
    """
    from fastapi.responses import JSONResponse

    logger.critical(
        "Unhandled exception",
        extra={
            "path": request.url.path,
            "method": request.method,
            "exception_type": type(exc).__name__,
        },
        exc_info=True,
    )

    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred. Please try again later.",
                "details": {},
            },
        },
    )