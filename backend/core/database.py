"""
Module: backend.core.database
Responsibility: Async database engine, session factory, and shared DB dependencies.

Architectural Boundaries:
- Initializes SQLAlchemy async engine with connection pooling.
- Provides async session factory and the canonical `get_db` dependency.
- No business logic, no domain models — just connection infrastructure.
- All modules that need a DB session import `get_db` from here.

Decision: `get_db` lives here alongside the session factory to avoid duplication.
Domain-level deps (repos/services) are wired in `api/deps.py` via `Depends(get_db)`.
"""

from collections.abc import AsyncGenerator
import logging

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

from core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# Async engine with connection pooling.
# pool_pre_ping=True ensures connections are valid before use — prevents
# stale connection errors after database restarts or network hiccups.
engine = create_async_engine(
    settings.database_url,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    pool_pre_ping=settings.database_pool_pre_ping,
    echo=settings.debug,
)

# Async session factory. `expire_on_commit=False` prevents SQLAlchemy from
# expiring objects after commit — important for async usage where objects
# may be accessed outside the session context (e.g., in responses).
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency: yields an async database session per request.

    The session is automatically committed on success and rolled back on exception.
    This is the canonical DB session dependency — import this everywhere a
    database session is needed.

    Usage:
        @router.get("/items")
        async def list_items(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db() -> None:
    """Create all tables on startup (development convenience).

    In production, migrations (Alembic) should be used instead.
    This is safe to call in development; it's a no-op for existing tables.

    TODO: Gate behind `settings.is_development` once prod migrations are fully adopted.
    """
    logger.info("Initializing database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    logger.info("Database tables initialized.")


async def close_db() -> None:
    """Dispose the engine connection pool on shutdown.

    Should be registered as a FastAPI shutdown event.
    """
    logger.info("Closing database connection pool...")
    await engine.dispose()
    logger.info("Database connection pool closed.")