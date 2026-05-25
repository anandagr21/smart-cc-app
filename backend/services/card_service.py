"""
Module: backend.services.card_service
Responsibility: Orchestrates use cases related to credit cards.

Architectural Boundaries:
- Coordinates workflows by calling Repositories for data access.
- MUST NOT contain HTTP logic (request/response).
- MUST NOT contain direct database queries (use Repositories).
- MUST NOT contain deterministic reward calculation logic (use Reward Engine).

TODO:
- Add reward engine integration for card benefit lookups when reward engine is built.
- Add card recommendation scoring when recommendation engine is built.
- Add spend analytics aggregation when analytics module is built.
"""

from uuid import UUID

from cards.exceptions import CardCatalogNotFoundException
from cards.schemas import (
    CardCatalogCreate,
    CardCatalogResponse,
    CardCatalogUpdate,
    UserCardCreate,
    UserCardResponse,
    UserCardUpdate,
)
from repositories.card_repository import CardCatalogRepository, UserCardRepository
from cards.intelligence.fee_waiver import get_waiver_progress


class CardCatalogService:
    """Service for managing the master card catalog.

    Coordinates CRUD operations on globally available card definitions.
    This is a non-user-scoped service — it manages the card catalog
    that users browse when adding cards to their collection.
    """

    def __init__(self, catalog_repo: CardCatalogRepository):
        self._catalog_repo = catalog_repo

    async def create_card(self, schema: CardCatalogCreate) -> CardCatalogResponse:
        """Create a new card definition in the master catalog."""
        entity = await self._catalog_repo.create(schema.model_dump())
        return CardCatalogResponse.model_validate(entity)

    async def list_cards(
        self, skip: int = 0, limit: int = 20
    ) -> tuple[list[CardCatalogResponse], int]:
        """List all card definitions in the master catalog (paginated)."""
        items, total = await self._catalog_repo.list(skip=skip, limit=limit)
        responses = [CardCatalogResponse.model_validate(item) for item in items]
        return responses, total

    async def list_active_cards(
        self, skip: int = 0, limit: int = 20
    ) -> tuple[list[CardCatalogResponse], int]:
        """List only active (currently offered) card definitions."""
        items, total = await self._catalog_repo.list_active(skip=skip, limit=limit)
        responses = [CardCatalogResponse.model_validate(item) for item in items]
        return responses, total

    async def get_card(self, card_id: UUID) -> CardCatalogResponse:
        """Get a single card definition by ID."""
        entity = await self._catalog_repo.get_by_id(card_id)
        return CardCatalogResponse.model_validate(entity)

    async def update_card(
        self, card_id: UUID, schema: CardCatalogUpdate
    ) -> CardCatalogResponse:
        """Update a card definition (partial update)."""
        entity = await self._catalog_repo.update(card_id, schema.model_dump(exclude_unset=True))
        return CardCatalogResponse.model_validate(entity)

    async def delete_card(self, card_id: UUID) -> None:
        """Delete a card definition from the catalog."""
        await self._catalog_repo.delete(card_id)


class UserCardService:
    """Service for managing user-owned cards.

    Coordinates CRUD operations on cards owned by specific users.
    Each user card references a card from the master catalog and
    adds user-specific metadata (limits, spend, billing dates, etc.).
    """

    def __init__(self, user_card_repo: UserCardRepository):
        self._user_card_repo = user_card_repo

    async def create_user_card(
        self, user_id: UUID, schema: UserCardCreate
    ) -> UserCardResponse:
        """Add a card to a user's collection.

        Links the user to a card from the master catalog, validates
        the catalog card exists, and prevents duplicate additions.
        """
        create_data = schema.model_dump()
        create_data["user_id"] = user_id

        entity = await self._user_card_repo.create(create_data)

        return self._to_response(entity)

    async def get_user_cards(
        self, user_id: UUID, skip: int = 0, limit: int = 20
    ) -> tuple[list[UserCardResponse], int]:
        """List all cards owned by a user (paginated).

        Returns card details with nested catalog information for
        each user card.
        """
        items, total = await self._user_card_repo.get_by_user(
            user_id, skip=skip, limit=limit
        )
        responses = [self._to_response(item) for item in items]
        return responses, total

    async def fetch_raw_cards(
        self, user_id: UUID, skip: int = 0, limit: int = 100
    ) -> list:
        """Fetch raw UserCard ORM entities with card_catalog eagerly loaded.

        Intended for internal engine consumption (insights, recommendations)
        where the full ORM object graph is needed, not just the API DTO.
        """
        items, _ = await self._user_card_repo.get_by_user(
            user_id, skip=skip, limit=limit
        )
        return items

    async def get_card_by_id(
        self, user_id: UUID, card_id: UUID
    ) -> UserCardResponse:
        """Get a specific user-owned card, scoped to the owning user."""
        entity = await self._user_card_repo.get_by_user_and_id(user_id, card_id)
        return self._to_response(entity)

    async def update_card(
        self, user_id: UUID, card_id: UUID, schema: UserCardUpdate
    ) -> UserCardResponse:
        """Update a user-owned card (partial update).

        Only fields explicitly set in the schema are updated.
        Scoped to the owning user for security.
        """
        # First verify the card belongs to this user
        await self._user_card_repo.get_by_user_and_id(user_id, card_id)

        entity = await self._user_card_repo.update(
            card_id, schema.model_dump(exclude_unset=True)
        )
        return self._to_response(entity)

    async def deactivate_card(
        self, user_id: UUID, card_id: UUID
    ) -> UserCardResponse:
        """Deactivate (soft-delete) a user-owned card.

        Card data is preserved for historical/analytics purposes.
        Scoped to the owning user for security.
        """
        entity = await self._user_card_repo.deactivate(user_id, card_id)
        return self._to_response(entity)

    @staticmethod
    def _to_response(entity) -> UserCardResponse:
        """Convert a UserCard entity to its response schema.

        Includes nested card catalog details when available via eager loading,
        and computes fee waiver tracking fields dynamically.
        """
        response = UserCardResponse.model_validate(entity)

        # Attach nested catalog details if the relationship was eagerly loaded
        if hasattr(entity, "card_catalog") and entity.card_catalog is not None:
            response.card_details = CardCatalogResponse.model_validate(
                entity.card_catalog
            )
            
            # Enrich with fee waiver intelligence
            waiver_data = get_waiver_progress(entity, entity.card_catalog)
            response.fee_waiver_threshold = waiver_data.get("fee_waiver_threshold")
            response.fee_waiver_progress_percent = waiver_data.get("fee_waiver_progress_percent")
            response.remaining_spend_for_waiver = waiver_data.get("remaining_spend_for_waiver")
            response.waiver_achieved = waiver_data.get("waiver_achieved")
            response.projected_waiver_status = waiver_data.get("projected_waiver_status")

        return response