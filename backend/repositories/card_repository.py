"""
Module: backend.repositories.card_repository
Responsibility: Database access abstraction for Card entities.

Architectural Boundaries:
- Handles ALL database queries for card catalog and user cards.
- MUST NOT contain business logic or rules.
- Returns domain models to the service layer.
- Inherits base CRUD from BaseRepository; extends with domain-specific queries.

TODO:
- Add get_active_cards_by_user() optimized query when analytics module is built.
- Add bulk catalog search/filter when frontend needs advanced filtering.
"""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from cards.exceptions import CardAlreadyExistsException, CardCatalogNotFoundException
from core.exceptions import NotFoundException
from models.card_catalog import CardCatalog
from models.user_card import UserCard
from repositories.base import BaseRepository


class CardCatalogRepository(BaseRepository[CardCatalog, dict, dict]):
    """Repository for the master card catalog (global card definitions).

    Handles CRUD for CardCatalog entities. This is a non-user-scoped resource
    — it defines cards that any user can add to their collection.

    create() and update() are inherited from BaseRepository (no overrides needed
    since BaseRepository already handles dict payloads).
    """

    def __init__(self, session: AsyncSession):
        super().__init__(session, CardCatalog)

    async def list_active(
        self, skip: int = 0, limit: int = 20
    ) -> tuple[list[CardCatalog], int]:
        """List only active (currently offered) card catalog entries."""
        return await self.list(skip=skip, limit=limit, is_active=True)


class UserCardRepository(BaseRepository[UserCard, dict, dict]):
    """Repository for user-owned card instances.

    Handles CRUD for UserCard entities. Each UserCard links a user
    to a card from the master catalog and stores user-specific metadata.
    """

    def __init__(self, session: AsyncSession):
        super().__init__(session, UserCard)

    async def create(self, create_schema: dict) -> UserCard:  # type: ignore[override]
        """Create a new user card from raw dict data.

        Validates that the referenced catalog card exists and that the user
        hasn't already added this card. Then delegates to BaseRepository.create().
        """
        user_id = create_schema.get("user_id")
        card_catalog_id = create_schema.get("card_catalog_id")

        # Verify catalog card exists
        catalog_result = await self.session.execute(
            select(CardCatalog).where(CardCatalog.id == card_catalog_id)
        )
        if catalog_result.scalar_one_or_none() is None:
            raise CardCatalogNotFoundException(card_id=str(card_catalog_id))

        # Prevent duplicate card addition for the same user
        duplicate_result = await self.session.execute(
            select(UserCard).where(
                UserCard.user_id == user_id,
                UserCard.card_catalog_id == card_catalog_id,
            )
        )
        if duplicate_result.scalar_one_or_none() is not None:
            raise CardAlreadyExistsException(
                user_id=str(user_id), card_catalog_id=str(card_catalog_id)
            )

        return await super().create(create_schema)

    # update() is inherited from BaseRepository — no override needed.

    async def get_by_user(
        self, user_id: UUID, skip: int = 0, limit: int = 20
    ) -> tuple[list[UserCard], int]:
        """List user cards for a given user, eagerly loading catalog details.

        Uses selectinload to avoid N+1 queries when accessing the related
        card catalog data in responses.
        """
        # Query with eager load of the related card catalog
        query = (
            select(UserCard)
            .where(UserCard.user_id == user_id)
            .options(selectinload(UserCard.card_catalog))
        )

        # Count total for pagination
        count_query = (
            select(func.count())
            .select_from(UserCard)
            .where(UserCard.user_id == user_id)
        )
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        # Apply ordering and pagination
        query = query.order_by(UserCard.created_at.desc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        items = list(result.scalars().all())

        return items, total

    async def get_by_user_and_id(
        self, user_id: UUID, card_id: UUID
    ) -> UserCard:
        """Get a specific user card, scoped to the owning user.

        This ensures users can only access their own cards.
        Eagerly loads the related card catalog for response formatting.
        """
        result = await self.session.execute(
            select(UserCard)
            .where(UserCard.id == card_id, UserCard.user_id == user_id)
            .options(selectinload(UserCard.card_catalog))
        )
        entity = result.scalar_one_or_none()
        if entity is None:
            raise NotFoundException(
                message=f"User card with id '{card_id}' not found for this user.",
                error_code="USER_CARD_NOT_FOUND",
            )
        return entity

    async def deactivate(self, user_id: UUID, card_id: UUID) -> UserCard:
        """Soft-delete a user card by setting is_active=False.

        Scoped to the owning user for security.
        """
        entity = await self.get_by_user_and_id(user_id, card_id)
        entity.is_active = False
        self.session.add(entity)
        await self.session.flush()
        await self.session.refresh(entity)
        return entity