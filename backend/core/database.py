"""
Module: backend.core.database
Responsibility: Async database engine and session management.

Architectural Boundaries:
- Initializes SQLAlchemy async engine with connection pooling.
- Provides async session dependency for FastAPI dependency injection.
- No business logic, no domain models — just connection infrastructure.

Decision: Using SQLAlchemy's `async_engine` + `async_sessionmaker` with asyncpg
driver. This is required by project rules (async-first). Connection pooling is
configured via application settings for production readiness.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

from core.config import get_settings

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

    The session is automatically closed when the request completes,
    even if an exception occurs (handled by the context manager).
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
    """
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


async def close_db() -> None:
    """Dispose the engine connection pool on shutdown."""
    await engine.dispose()