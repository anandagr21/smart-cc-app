"""
Module: backend.api.deps
Responsibility: FastAPI dependency injection providers for domain-specific wiring.

Architectural Boundaries:
- Centralizes all `Depends()` providers for repositories and services.
- Each provider is a callable that FastAPI can inject into route handlers.
- Services and repositories are instantiated here with their dependencies wired.
- This avoids circular imports and keeps route files clean.

Decision: The canonical `get_db` lives in `core.database` — this module imports
it and uses it as a sub-dependency for all domain-level deps. This avoids
duplicating the `get_db` definition and keeps a single source of truth.

Usage in routes:
    @router.get("/cards")
    async def list_cards(service: CardCatalogService = Depends(get_card_catalog_service)):
        ...
"""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db  # Canonical DB dependency
from repositories.card_repository import CardCatalogRepository, UserCardRepository
from repositories.user_repository import UserRepository
from services.card_service import CardCatalogService, UserCardService


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