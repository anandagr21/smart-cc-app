"""
Module: backend.merchants.routes
Responsibility: HTTP adapters for merchant normalization, categorization, and CRUD.

Architectural Boundaries:
- Thin routes only: validate requests, call services, format responses.
- MUST NOT contain business logic.
- MUST NOT contain database access.
- MUST NOT contain normalization or matching logic.
- All endpoints are async.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends

from api.deps import get_merchant_service
from merchants.schemas import (
    AliasRegisterRequest,
    MerchantCreate,
    MerchantResponse,
    MerchantSearchResponse,
    NormalizeRequest,
    NormalizeResponse,
)
from merchants.service import MerchantService

router = APIRouter(prefix="/merchants", tags=["merchants"])


# ------------------------------------------------------------------
# Normalization
# ------------------------------------------------------------------

@router.post("/normalize", response_model=NormalizeResponse)
async def normalize_merchant(
    request: NormalizeRequest,
    service: MerchantService = Depends(get_merchant_service),
) -> NormalizeResponse:
    """Normalize a raw merchant name and optionally suggest a category.

    This endpoint applies the deterministic normalization pipeline:
    lowercase → punctuation removal → whitespace cleanup → token
    normalization → suffix removal → deduplication.

    No database access is performed — this is a pure compute endpoint.
    """
    return service.normalize_merchant(raw_name=request.raw_name)


# ------------------------------------------------------------------
# Merchant CRUD
# ------------------------------------------------------------------

@router.post("", response_model=MerchantResponse, status_code=201)
async def create_merchant(
    request: MerchantCreate,
    service: MerchantService = Depends(get_merchant_service),
) -> MerchantResponse:
    """Create a canonical merchant with optional aliases.

    The canonical name is re-normalized on creation to ensure consistency.
    Category is auto-detected if not explicitly provided.
    """
    return await service.create_merchant(
        canonical_name=request.canonical_name,
        display_name=request.display_name,
        category=request.category,
        aliases=request.aliases,
    )


@router.get("/{merchant_id}", response_model=MerchantResponse)
async def get_merchant(
    merchant_id: UUID,
    service: MerchantService = Depends(get_merchant_service),
) -> MerchantResponse:
    """Get a merchant by its UUID, including all registered aliases."""
    return await service.get_merchant(merchant_id)


@router.get("/search", response_model=MerchantSearchResponse)
async def search_merchants(
    raw_name: str,
    service: MerchantService = Depends(get_merchant_service),
) -> MerchantSearchResponse:
    """Find the best-matching canonical merchant for a raw input name.

    Match priority:
      1. Exact canonical match
      2. Alias match
      3. Normalized token match
      4. Partial fallback match

    If no match is found, returns with match_type="none".
    """
    return await service.find_best_match(raw_name)


# ------------------------------------------------------------------
# Alias management
# ------------------------------------------------------------------

@router.post("/{merchant_id}/aliases", response_model=MerchantResponse)
async def register_alias(
    merchant_id: UUID,
    request: AliasRegisterRequest,
    service: MerchantService = Depends(get_merchant_service),
) -> MerchantResponse:
    """Register a new raw-name alias for an existing merchant.

    The raw name is normalized before storage.
    """
    return await service.register_alias(
        merchant_id=merchant_id,
        raw_name=request.raw_name,
        source=request.source,
    )