"""
Module: backend.main
Responsibility: FastAPI application bootstrap and lifecycle management.

Architectural Boundaries:
- Wires together routes, middleware, CORS, and database initialization.
- The single entry point for the application server.
- No business logic — just infrastructure composition.

Decision: The `lifespan` context manager handles startup/shutdown lifecycle.
This is the recommended FastAPI pattern for managing resources like database
connection pools. Middleware and routers are registered here in a clear,
readable order.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.v1 import api_router
from core.config import get_settings
from core.database import close_db, init_db
from core.logging import get_logger, setup_logging
from core.middleware import setup_middleware
from core.rate_limit import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: startup and shutdown hooks.

    Startup:
    - Initialize structured logging
    - Optionally create database tables (development convenience)

    Shutdown:
    - Gracefully close database connection pool
    """
    settings = get_settings()

    # ---- Startup ----
    setup_logging()
    logger.info(
        "Starting %s v%s in %s mode",
        settings.app_name,
        settings.app_version,
        settings.environment,
    )

    # In development, auto-create tables for convenience.
    # In production, use Alembic migrations instead (via CI/CD).
    if settings.is_development:
        logger.info("Development mode: auto-creating database tables")
        await init_db()

    yield  # Application runs here

    # ---- Shutdown ----
    logger.info("Shutting down %s", settings.app_name)
    await close_db()


def create_app() -> FastAPI:
    """Build and configure the FastAPI application.

    Returns a fully configured FastAPI app ready to serve requests.
    Called by uvicorn in the entry point (e.g., `uvicorn backend.main:app`).
    """
    settings = get_settings()

    if settings.sentry_dsn_backend and settings.is_production:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration

        sentry_sdk.init(
            dsn=settings.sentry_dsn_backend,
            environment=settings.environment.value if hasattr(settings.environment, "value") else settings.environment,
            traces_sample_rate=0.1,
            release=settings.app_version,
            integrations=[FastApiIntegration()],
        )

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
        lifespan=lifespan,
    )
    
    app.state.limiter = limiter

    if settings.is_production and "*" in settings.cors_origins:
        raise ValueError("Wildcard CORS origins are not permitted in production.")

    # CORS — allow configured origins (frontend, mobile dev)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    )

    # Request ID, logging, global exception handling
    setup_middleware(app)
    
    app.add_middleware(SlowAPIMiddleware)

    # Register global exception handlers
    from core.exceptions import (
        AppException,
        app_exception_handler,
        pydantic_validation_handler,
        generic_exception_handler,
    )
    from fastapi.exceptions import RequestValidationError
    
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(RequestValidationError, pydantic_validation_handler)
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

    # API routes — all versioned under /api/v1
    app.include_router(api_router)

    return app


# Module-level app instance — used by uvicorn (`uvicorn backend.main:app`)
app = create_app()