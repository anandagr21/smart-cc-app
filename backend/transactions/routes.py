"""
Module: backend.transactions.routes
Responsibility: HTTP endpoints for Transactions.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_merchant_service, get_transaction_enrichment_service
from auth.dependencies import get_current_user
from auth.schemas import UserResponse
from core.database import get_db
from merchants.service import MerchantService
from schemas.common import PaginatedResponse, SingleResponse
from transactions.enrichment import TransactionEnrichmentService
from transactions.exceptions import InvalidTransactionError, TransactionNotFoundError
from transactions.repository import TransactionRepository
from transactions.schemas import EnrichedTransactionResponse, TransactionCreate, TransactionResponse, TransactionUpdateStatus, TransactionUpdate
from transactions.service import TransactionService

router = APIRouter(prefix="/transactions", tags=["Transactions"])


async def get_transaction_repo(db: AsyncSession = Depends(get_db)) -> TransactionRepository:
    """Dependency provider for TransactionRepository."""
    return TransactionRepository(session=db)


from cards.intelligence.spend_aggregator import SpendAggregator

async def get_spend_aggregator(db: AsyncSession = Depends(get_db)) -> SpendAggregator:
    return SpendAggregator(session=db)

async def get_transaction_service(
    repo: TransactionRepository = Depends(get_transaction_repo),
    merchant_service: MerchantService = Depends(get_merchant_service),
    spend_aggregator: SpendAggregator = Depends(get_spend_aggregator),
) -> TransactionService:
    """Dependency provider for TransactionService."""
    return TransactionService(
        repository=repo, 
        merchant_service=merchant_service, 
        spend_aggregator=spend_aggregator
    )


@router.post(
    "",
    response_model=SingleResponse[EnrichedTransactionResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new transaction",
)
async def create_transaction(
    request: TransactionCreate,
    current_user: UserResponse = Depends(get_current_user),
    service: TransactionService = Depends(get_transaction_service),
    enrichment_service: TransactionEnrichmentService = Depends(get_transaction_enrichment_service),
) -> dict:
    try:
        result = await service.create_transaction(current_user.id, request)
        enriched = await enrichment_service.enrich_transactions(current_user.id, [result])
        return {"data": enriched[0]}
    except InvalidTransactionError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "",
    response_model=PaginatedResponse[EnrichedTransactionResponse],
    status_code=status.HTTP_200_OK,
    summary="List transactions for the current user",
)
async def list_user_transactions(
    skip: int = 0,
    limit: int = 50,
    current_user: UserResponse = Depends(get_current_user),
    service: TransactionService = Depends(get_transaction_service),
    enrichment_service: TransactionEnrichmentService = Depends(get_transaction_enrichment_service),
) -> dict:
    results = await service.fetch_user_transactions(current_user.id, skip, limit)
    enriched = await enrichment_service.enrich_transactions(current_user.id, results)
    return {
        "data": enriched,
        "meta": {
            "total": len(enriched),
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "page_size": limit,
            "has_next": False  # Simplified for now
        }
    }


@router.get(
    "/card/{card_id}",
    response_model=PaginatedResponse[EnrichedTransactionResponse],
    status_code=status.HTTP_200_OK,
    summary="List transactions for a specific user card",
)
async def list_card_transactions(
    card_id: UUID,
    skip: int = 0,
    limit: int = 50,
    current_user: UserResponse = Depends(get_current_user),
    service: TransactionService = Depends(get_transaction_service),
    enrichment_service: TransactionEnrichmentService = Depends(get_transaction_enrichment_service),
) -> dict:
    results = await service.fetch_card_transactions(card_id, skip, limit)
    enriched = await enrichment_service.enrich_transactions(current_user.id, results)
    return {
        "data": enriched,
        "meta": {
            "total": len(enriched),
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "page_size": limit,
            "has_next": False
        }
    }


@router.get(
    "/{transaction_id}",
    response_model=SingleResponse[EnrichedTransactionResponse],
    status_code=status.HTTP_200_OK,
    summary="Get a specific transaction",
)
async def get_transaction(
    transaction_id: UUID,
    current_user: UserResponse = Depends(get_current_user),
    service: TransactionService = Depends(get_transaction_service),
    enrichment_service: TransactionEnrichmentService = Depends(get_transaction_enrichment_service),
) -> dict:
    try:
        result = await service.get_transaction(transaction_id)
        if result.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        enriched = await enrichment_service.enrich_transactions(current_user.id, [result])
        return {"data": enriched[0]}
    except TransactionNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.patch(
    "/{transaction_id}/status",
    response_model=SingleResponse[EnrichedTransactionResponse],
    status_code=status.HTTP_200_OK,
    summary="Update transaction status",
)
async def update_transaction_status(
    transaction_id: UUID,
    request: TransactionUpdateStatus,
    current_user: UserResponse = Depends(get_current_user),
    service: TransactionService = Depends(get_transaction_service),
    enrichment_service: TransactionEnrichmentService = Depends(get_transaction_enrichment_service),
) -> dict:
    try:
        result = await service.get_transaction(transaction_id)
        if result.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
            
        updated = await service.update_status(transaction_id, request)
        enriched = await enrichment_service.enrich_transactions(current_user.id, [updated])
        return {"data": enriched[0]}
    except TransactionNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except InvalidTransactionError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
@router.patch(
    "/{transaction_id}",
    response_model=SingleResponse[EnrichedTransactionResponse],
    status_code=status.HTTP_200_OK,
    summary="Partially update a transaction",
)
async def update_transaction(
    transaction_id: UUID,
    request: TransactionUpdate,
    current_user: UserResponse = Depends(get_current_user),
    service: TransactionService = Depends(get_transaction_service),
    enrichment_service: TransactionEnrichmentService = Depends(get_transaction_enrichment_service),
) -> dict:
    try:
        result = await service.get_transaction(transaction_id)
        if result.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
            
        updated = await service.update_transaction(transaction_id, request)
        enriched = await enrichment_service.enrich_transactions(current_user.id, [updated])
        return {"data": enriched[0]}
    except TransactionNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except InvalidTransactionError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
