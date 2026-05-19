"""
Module: backend.core.middleware
Responsibility: Cross-cutting HTTP concerns — request ID, logging, error handling.

Architectural Boundaries:
- Intercepts every HTTP request. No business logic, no domain knowledge.
- Adds X-Request-ID to every request for distributed tracing.
- Logs request method, path, status, and duration.
- Catches unhandled exceptions → consistent JSON error responses.

Decision: Middleware is the right place for request ID propagation and global
exception handling because it covers 100% of requests without needing to
decorate individual route handlers. The exception handler ensures that even
unexpected errors produce the standard error response format from skills/api.md.
"""

import time
import uuid
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError as PydanticValidationError

from core.exceptions import DomainException
from core.logging import get_logger

logger = get_logger(__name__)


def setup_middleware(app: FastAPI) -> None:
    """Register all middleware and exception handlers on the FastAPI app.

    Called once during application bootstrap in main.py.
    """

    @app.middleware("http")
    async def request_context_middleware(request: Request, call_next: Any) -> JSONResponse:
        """Middleware that adds request_id, logs every request, and handles errors.

        Responsibilities:
        1. Generate or propagate X-Request-ID header
        2. Store request_id in request.state for access by route handlers
        3. Log request method, path, status, and duration
        4. Catch unhandled exceptions and return consistent error responses
        """
        # Generate or propagate request ID
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id

        # Log incoming request
        start_time = time.time()
        logger.info(
            "%s %s",
            request.method,
            request.url.path,
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "client_ip": request.client.host if request.client else None,
            },
        )

        try:
            response = await call_next(request)
        except Exception as exc:
            # Catch-all for unhandled exceptions
            response = _build_error_response(request_id, exc)

        duration_ms = round((time.time() - start_time) * 1000)

        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id

        # Log response
        logger.info(
            "%s %s → %s",
            request.method,
            request.url.path,
            response.status_code,
            extra={
                "request_id": request_id,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            },
        )

        return response

    @app.exception_handler(DomainException)
    async def domain_exception_handler(request: Request, exc: DomainException) -> JSONResponse:
        """Handle domain exceptions — return structured error response."""
        request_id = getattr(request.state, "request_id", None)
        logger.warning(
            "Domain error: %s",
            exc.message,
            extra={
                "request_id": request_id,
                "error_code": exc.error_code,
                "status_code": exc.status_code,
                "details": exc.details,
            },
        )
        return _build_error_response(request_id, exc)

    @app.exception_handler(PydanticValidationError)
    async def validation_exception_handler(
        request: Request, exc: PydanticValidationError
    ) -> JSONResponse:
        """Handle Pydantic validation errors — return 422 with details."""
        request_id = getattr(request.state, "request_id", None)
        errors = exc.errors()
        logger.warning(
            "Validation error: %d errors",
            len(errors),
            extra={
                "request_id": request_id,
                "errors": errors,
            },
        )
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Request validation failed.",
                    "details": {"errors": errors},
                }
            },
        )


def _build_error_response(request_id: str | None, exc: Exception) -> JSONResponse:
    """Build a consistent error JSONResponse from any exception.

    DomainException → uses its own error_code and status_code.
    Any other Exception → returns 500 INTERNAL_ERROR (safe for production).
    """
    if isinstance(exc, DomainException):
        status_code = exc.status_code
        error_body: dict[str, Any] = {
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "details": exc.details,
            }
        }
    else:
        # Unexpected error — log full traceback, return generic message
        logger.error(
            "Unhandled exception: %s",
            str(exc),
            extra={"request_id": request_id},
            exc_info=True,
        )
        status_code = 500
        error_body = {
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred. Please try again later.",
                "details": {},
            }
        }

    return JSONResponse(status_code=status_code, content=error_body)