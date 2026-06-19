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
from merchants.repository import AliasRepository, MerchantRepository
from merchants.service import MerchantService
from repositories.card_repository import CardCatalogRepository, UserCardRepository
from repositories.user_repository import UserRepository
from rewards.service import RewardRuleService
from services.card_service import CardCatalogService, UserCardService
from transactions.repository import TransactionRepository


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


async def get_transaction_repo(
    db: AsyncSession = Depends(get_db),
) -> TransactionRepository:
    """Provide a TransactionRepository instance wired with the current DB session."""
    return TransactionRepository(session=db)


async def get_user_card_service(
    user_card_repo: UserCardRepository = Depends(get_user_card_repo),
    transaction_repo: TransactionRepository = Depends(get_transaction_repo),
) -> UserCardService:
    """Provide a UserCardService instance with its repository dependencies wired."""
    return UserCardService(user_card_repo=user_card_repo, transaction_repo=transaction_repo)


async def get_merchant_repo(
    db: AsyncSession = Depends(get_db),
) -> MerchantRepository:
    """Provide a MerchantRepository instance wired with the current DB session."""
    return MerchantRepository(session=db)


async def get_alias_repo(
    db: AsyncSession = Depends(get_db),
) -> AliasRepository:
    """Provide an AliasRepository instance wired with the current DB session."""
    return AliasRepository(session=db)


async def get_merchant_service(
    merchant_repo: MerchantRepository = Depends(get_merchant_repo),
    alias_repo: AliasRepository = Depends(get_alias_repo),
) -> MerchantService:
    """Provide a MerchantService instance with its repository dependencies wired."""
    return MerchantService(merchant_repo=merchant_repo, alias_repo=alias_repo)


async def get_reward_rule_service(
    db: AsyncSession = Depends(get_db),
) -> RewardRuleService:
    """Provide a RewardRuleService instance wired with the current DB session."""
    return RewardRuleService(session=db)


from transactions.enrichment import TransactionEnrichmentService

async def get_transaction_enrichment_service(
    user_card_service: UserCardService = Depends(get_user_card_service),
    reward_rule_service: RewardRuleService = Depends(get_reward_rule_service),
) -> TransactionEnrichmentService:
    """Provide a TransactionEnrichmentService instance wired with its dependencies."""
    return TransactionEnrichmentService(
        user_card_service=user_card_service,
        reward_rule_service=reward_rule_service,
    )
