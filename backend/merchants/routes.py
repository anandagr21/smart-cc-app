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
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db, get_merchant_service
from merchants.resolution_engine import resolve as run_resolution
from merchants.schemas import (
    AliasConfirmRequest,
    AliasConfirmResponse,
    AliasRegisterRequest,
    MerchantCreate,
    MerchantResponse,
    MerchantSearchResponse,
    NormalizeRequest,
    NormalizeResponse,
    ResolutionRequest,
    ResolutionResponse,
)
from merchants.service import MerchantService

router = APIRouter(prefix="/merchants", tags=["merchants"])


# ------------------------------------------------------------------
# Resolution Engine
# ------------------------------------------------------------------

@router.post("/resolve", response_model=ResolutionResponse)
async def resolve_merchant(
    request: ResolutionRequest,
    service: MerchantService = Depends(get_merchant_service),
    db: AsyncSession = Depends(get_db),
) -> ResolutionResponse:
    """Resolve a noisy user-entered merchant name to a canonical merchant.

    Multi-stage pipeline:
      1. Cache lookup
      2. Exact alias match (< 10ms)
      3. RapidFuzz fuzzy search (< 50ms)
         - score >= 95 → FUZZY_AUTO
         - score 80-94 → LLM Recovery (< 500ms)
         - score 50-79 → LLM Discovery (< 1s)
         - score < 50  → UNKNOWN (no LLM)
      4. Metrics emission

    Examples: "flipcart" → Flipkart, "swigy" → Swiggy, "flpkrt" → Flipkart
    """
    result = await run_resolution(raw_input=request.raw_name, session=db)
    return ResolutionResponse(
        merchant_id=result.merchant_id,
        merchant_name=result.merchant_name,
        category=result.category,
        merchant_type=result.merchant_type,
        confidence=result.confidence,
        resolution_type=result.resolution_type,
        requires_confirmation=result.requires_confirmation,
        pending_review_id=result.pending_review_id,
    )


@router.post("/confirm-alias", response_model=AliasConfirmResponse)
async def confirm_alias(
    request: AliasConfirmRequest,
    service: MerchantService = Depends(get_merchant_service),
    db: AsyncSession = Depends(get_db),
) -> AliasConfirmResponse:
    """Confirm that a raw merchant name maps to a specific canonical merchant.

    Records the user's correction in the alias learning table and immediately
    promotes the alias to merchant_aliases with source=USER_CONFIRMED.
    Future resolutions of this input will match via alias (no LLM needed).

    Example: User confirms "flipcart" → Flipkart.
    """
    return await service.confirm_alias(
        raw_name=request.raw_name,
        merchant_id=request.merchant_id,
        session=db,
    )


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