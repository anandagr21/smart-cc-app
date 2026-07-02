"""
Module: backend.core.middleware
Responsibility: Lightweight Starlette middleware for request correlation and observability.

Architectural Boundaries:
- Pure middleware — no business logic, no database, no domain awareness.
- Adds request_id to every incoming HTTP request for log correlation.
- Optionally logs request duration for performance monitoring.
- Registered once in main.py via `app.add_middleware(...)`.

Decision: A single `RequestIDMiddleware` class is sufficient. If more middleware
is needed later (e.g., CORS, rate limiting), it should follow the same pattern.
"""

from __future__ import annotations

import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)

REQUEST_ID_HEADER = "X-Request-ID"


def setup_middleware(app) -> None:
    """Register core middleware on a FastAPI application.

    This is the canonical setup function called from `main.py`.
    Add new middleware here as the application grows (e.g., CORS, rate limiting).

    Args:
        app: FastAPI application instance.
    """
    # Request ID injection + timing logging (applied first — runs on every request)
    app.add_middleware(RequestIDMiddleware)
    
    # Security Headers
    app.add_middleware(SecurityHeadersMiddleware)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Add a unique request_id to every incoming request and propagate it to logs.

    If the client sends an `X-Request-ID` header, that value is reused (allows
    distributed tracing across services). Otherwise, a new UUIDv4 is generated.

    The request_id is stored in `request.state.request_id` so that downstream
    handlers and dependencies can access it if needed.

    Request duration is logged at INFO level for observability.
    """

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        # Reuse client-supplied ID or generate a new one
        request_id = request.headers.get(REQUEST_ID_HEADER) or str(uuid.uuid4())
        request.state.request_id = request_id

        start_time = time.perf_counter()

        # Process the request
        response = await call_next(request)

        # Attach request_id to the response header for client-side correlation
        response.headers[REQUEST_ID_HEADER] = request_id

        # Log request completion with duration
        duration_ms = (time.perf_counter() - start_time) * 1000
        logger.info(
            "%s %s completed",
            request.method, request.url.path,
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round(duration_ms, 2),
            },
        )

        return response

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add standard security headers to all HTTP responses."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)

        # HSTS — only set on HTTPS connections (avoids issues behind proxies in dev/staging)
        if request.url.scheme == "https" or request.headers.get("X-Forwarded-Proto") == "https":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https:; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )

        return response