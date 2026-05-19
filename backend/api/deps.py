"""
Module: backend.api.deps
Responsibility: FastAPI dependency injection providers.

Architectural Boundaries:
- Centralizes all `Depends()` providers in one place.
- Each provider is a callable that FastAPI can inject into route handlers.
- Services and repositories are instantiated here with their dependencies wired.
- This avoids circular imports and keeps route files clean.

Decision: A single `deps.py` file is the standard FastAPI pattern for dependency
injection. As the app grows, this file may be split per domain, but starting
with a single file keeps things simple (per project philosophy: simple over clever).

Usage in routes:
    @router.get("/health")
    async def health(db: AsyncSession = Depends(get_db)):
        ...
"""

from collections.abc import AsyncGenerator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import async_session_factory
from repositories.card_repository import CardCatalogRepository, UserCardRepository
from repositories.user_repository import UserRepository
from services.card_service import CardCatalogService, UserCardService


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Provide an async database session per request.

    Session is automatically committed on success and rolled back on exception.
    This is the primary dependency for all repositories and services.
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_user_repo(db: AsyncSession = Depends(get_db)) -> UserRepository:
    """Provide a UserRepository instance wired with the current DB session."""
    return UserRepository(session=db)


async def get_card_catalog_repo(
    db: AsyncSession = Depends(get_db),
) -> CardCatalogRepository:
    """Provide a CardCatalogRepository instance wired with the current DB session."""
    return CardCatalogRepository(session=db)


async def get_user_card_repo(
    db: AsyncSession = Depends(get_db),
) -> UserCardRepository:
    """Provide a UserCardRepository instance wired with the current DB session."""
    return UserCardRepository(session=db)


async def get_card_catalog_service(
    catalog_repo: CardCatalogRepository = Depends(get_card_catalog_repo),
) -> CardCatalogService:
    """Provide a CardCatalogService instance with its repository dependency wired."""
    return CardCatalogService(catalog_repo=catalog_repo)


async def get_user_card_service(
    user_card_repo: UserCardRepository = Depends(get_user_card_repo),
) -> UserCardService:
    """Provide a UserCardService instance with its repository dependency wired."""
    return UserCardService(user_card_repo=user_card_repo)
