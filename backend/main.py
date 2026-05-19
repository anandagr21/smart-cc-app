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
    # In production, use Alembic migrations instead.
    if settings.environment == "development":
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

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
        lifespan=lifespan,
    )

    # CORS — allow configured origins (frontend, mobile dev)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Request ID, logging, global exception handling
    setup_middleware(app)

    # API routes — all versioned under /api/v1
    app.include_router(api_router)

    return app


# Module-level app instance — used by uvicorn (`uvicorn backend.main:app`)
app = create_app()