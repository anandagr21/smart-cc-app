"""
Module: backend.api.v1.cards
Responsibility: HTTP interface for card-related operations.

Architectural Boundaries:
- MUST NOT contain business logic.
- MUST NOT access the database directly.
- Only responsible for request/response orchestration, validation via Pydantic,
  and delegation to the Service layer.

Routes:
    POST   /cards/catalog          — Create a card catalog entry (admin)
    GET    /cards/catalog          — List card catalog entries
    GET    /cards/catalog/{id}     — Get a catalog entry
    PATCH  /cards/catalog/{id}     — Update a catalog entry
    DELETE /cards/catalog/{id}     — Delete a catalog entry

    POST   /cards          — Add a card to the user's collection
    GET    /cards          — List user-owned cards
    GET    /cards/{id}     — Get a specific user card
    PATCH  /cards/{id}     — Update a user card
    DELETE /cards/{id}     — Deactivate a user card

TODO:
- Add admin-only guards for catalog management endpoints.
- Add card recommendation endpoint when recommendation engine is built.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Path, Query

from api.deps import get_card_catalog_service, get_user_card_service
from auth.dependencies import get_current_user
from auth.schemas import UserResponse
from cards.schemas import (
    CardCatalogCreate,
    CardCatalogResponse,
    CardCatalogUpdate,
    UserCardCreate,
    UserCardResponse,
    UserCardUpdate,
)
from schemas.common import PaginatedResponse, SingleResponse
from services.card_service import CardCatalogService, UserCardService

router = APIRouter(prefix="/cards", tags=["Cards"])


# ---------------------------------------------------------------------------
# Card Catalog Endpoints (Admin)
# ---------------------------------------------------------------------------
#
# TODO: Add admin role guard via dependency injection.
# These endpoints manage the global card catalog — only admins should
# be able to create/update/delete catalog entries.
#


@router.post(
    "/catalog", response_model=SingleResponse[CardCatalogResponse], status_code=201
)
async def create_card_catalog_entry(
    body: CardCatalogCreate,
    catalog_service: CardCatalogService = Depends(get_card_catalog_service),
) -> SingleResponse[CardCatalogResponse]:
    """Create a new card definition in the master catalog.

    This is an admin-only endpoint. TODO: Add admin authorization guard.
    """
    result = await catalog_service.create_card(body)
    return SingleResponse(data=result)


@router.get("/catalog", response_model=PaginatedResponse[CardCatalogResponse])
async def list_card_catalog(
    catalog_service: CardCatalogService = Depends(get_card_catalog_service),
    skip: int = Query(default=0, ge=0, description="Records to skip (pagination offset)."),
    limit: int = Query(default=20, ge=1, le=100, description="Max records per page."),
    active_only: bool = Query(
        default=True,
        description="When true, returns only active cards.",
    ),
) -> PaginatedResponse[CardCatalogResponse]:
    """List card definitions from the master catalog.

    Public endpoint — anyone can browse the catalog.
    """
    if active_only:
        items, total = await catalog_service.list_active_cards(skip=skip, limit=limit)
    else:
        items, total = await catalog_service.list_cards(skip=skip, limit=limit)

    return PaginatedResponse(
        data=items,
        meta={
            "total": total,
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "page_size": limit,
            "has_next": (skip + limit) < total,
        },
    )


@router.get("/catalog/{card_id}", response_model=SingleResponse[CardCatalogResponse])
async def get_card_catalog_entry(
    card_id: UUID = Path(..., description="UUID of the catalog entry."),
    catalog_service: CardCatalogService = Depends(get_card_catalog_service),
) -> SingleResponse[CardCatalogResponse]:
    """Get details of a specific card catalog entry."""
    result = await catalog_service.get_card(card_id)
    return SingleResponse(data=result)


@router.patch(
    "/catalog/{card_id}", response_model=SingleResponse[CardCatalogResponse]
)
async def update_card_catalog_entry(
    card_id: UUID = Path(..., description="UUID of the catalog entry."),
    body: CardCatalogUpdate = ...,
    catalog_service: CardCatalogService = Depends(get_card_catalog_service),
) -> SingleResponse[CardCatalogResponse]:
    """Update a card catalog entry (partial update).

    This is an admin-only endpoint. TODO: Add admin authorization guard.
    """
    result = await catalog_service.update_card(card_id, body)
    return SingleResponse(data=result)


@router.delete("/catalog/{card_id}", status_code=204)
async def delete_card_catalog_entry(
    card_id: UUID = Path(..., description="UUID of the catalog entry."),
    catalog_service: CardCatalogService = Depends(get_card_catalog_service),
) -> None:
    """Delete a card definition from the master catalog.

    This is an admin-only endpoint. TODO: Add admin authorization guard.
    """
    await catalog_service.delete_card(card_id)


# ---------------------------------------------------------------------------
# User Card Endpoints
# ---------------------------------------------------------------------------


@router.post("", response_model=SingleResponse[UserCardResponse], status_code=201)
async def create_user_card(
    body: UserCardCreate,
    current_user: UserResponse = Depends(get_current_user),
    user_card_service: UserCardService = Depends(get_user_card_service),
) -> SingleResponse[UserCardResponse]:
    """Add a credit card to the authenticated user's collection.

    Links the user to a card from the master catalog. Validates that
    the catalog card exists and prevents duplicate additions.
    """
    result = await user_card_service.create_user_card(
        user_id=current_user.id, schema=body
    )
    return SingleResponse(data=result)


@router.get("", response_model=PaginatedResponse[UserCardResponse])
async def list_user_cards(
    current_user: UserResponse = Depends(get_current_user),
    user_card_service: UserCardService = Depends(get_user_card_service),
    skip: int = Query(default=0, ge=0, description="Records to skip (pagination offset)."),
    limit: int = Query(default=20, ge=1, le=100, description="Max records per page."),
) -> PaginatedResponse[UserCardResponse]:
    """List all credit cards owned by the authenticated user.

    Returns paginated results with nested card catalog details.
    """
    items, total = await user_card_service.get_user_cards(
        user_id=current_user.id, skip=skip, limit=limit
    )
    return PaginatedResponse(
        data=items,
        meta={
            "total": total,
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "page_size": limit,
            "has_next": (skip + limit) < total,
        },
    )


@router.get("/{card_id}", response_model=SingleResponse[UserCardResponse])
async def get_user_card(
    card_id: UUID = Path(..., description="UUID of the user-owned card."),
    current_user: UserResponse = Depends(get_current_user),
    user_card_service: UserCardService = Depends(get_user_card_service),
) -> SingleResponse[UserCardResponse]:
    """Get details of a specific user-owned card.

    Scoped to the authenticated user — users can only access their own cards.
    """
    result = await user_card_service.get_card_by_id(
        user_id=current_user.id, card_id=card_id
    )
    return SingleResponse(data=result)


@router.patch("/{card_id}", response_model=SingleResponse[UserCardResponse])
async def update_user_card(
    card_id: UUID = Path(..., description="UUID of the user-owned card."),
    body: UserCardUpdate = ...,
    current_user: UserResponse = Depends(get_current_user),
    user_card_service: UserCardService = Depends(get_user_card_service),
) -> SingleResponse[UserCardResponse]:
    """Update a user-owned card (partial update).

    Only fields provided in the request body are updated.
    Scoped to the authenticated user.
    """
    result = await user_card_service.update_card(
        user_id=current_user.id, card_id=card_id, schema=body
    )
    return SingleResponse(data=result)


@router.delete("/{card_id}", response_model=SingleResponse[UserCardResponse])
async def deactivate_user_card(
    card_id: UUID = Path(..., description="UUID of the user-owned card."),
    current_user: UserResponse = Depends(get_current_user),
    user_card_service: UserCardService = Depends(get_user_card_service),
) -> SingleResponse[UserCardResponse]:
    """Deactivate (soft-delete) a user-owned card.

    Card data is preserved for historical purposes. The card will
    no longer appear in active card lists and will not be used
    for recommendations.
    """
    result = await user_card_service.deactivate_card(
        user_id=current_user.id, card_id=card_id
    )
    return SingleResponse(data=result)

