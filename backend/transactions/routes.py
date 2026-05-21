"""
Module: backend.transactions.routes
Responsibility: HTTP endpoints for Transactions.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_merchant_service
from auth.dependencies import get_current_user
from auth.schemas import UserResponse
from core.database import get_db
from merchants.service import MerchantService
from schemas.common import PaginatedResponse, SingleResponse
from transactions.exceptions import InvalidTransactionError, TransactionNotFoundError
from transactions.repository import TransactionRepository
from transactions.schemas import TransactionCreate, TransactionResponse, TransactionUpdateStatus
from transactions.service import TransactionService

router = APIRouter(prefix="/transactions", tags=["Transactions"])


async def get_transaction_repo(db: AsyncSession = Depends(get_db)) -> TransactionRepository:
    """Dependency provider for TransactionRepository."""
    return TransactionRepository(session=db)


async def get_transaction_service(
    repo: TransactionRepository = Depends(get_transaction_repo),
    merchant_service: MerchantService = Depends(get_merchant_service),
) -> TransactionService:
    """Dependency provider for TransactionService."""
    return TransactionService(repository=repo, merchant_service=merchant_service)


@router.post(
    "",
    response_model=SingleResponse[TransactionResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new transaction",
)
async def create_transaction(
    request: TransactionCreate,
    current_user: UserResponse = Depends(get_current_user),
    service: TransactionService = Depends(get_transaction_service),
) -> dict:
    try:
        result = await service.create_transaction(current_user.id, request)
        return {"data": result}
    except InvalidTransactionError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "",
    response_model=PaginatedResponse[TransactionResponse],
    status_code=status.HTTP_200_OK,
    summary="List transactions for the current user",
)
async def list_user_transactions(
    skip: int = 0,
    limit: int = 50,
    current_user: UserResponse = Depends(get_current_user),
    service: TransactionService = Depends(get_transaction_service),
) -> dict:
    results = await service.fetch_user_transactions(current_user.id, skip, limit)
    return {"data": results, "total": len(results)}  # For real pagination we'd return actual total


@router.get(
    "/card/{card_id}",
    response_model=PaginatedResponse[TransactionResponse],
    status_code=status.HTTP_200_OK,
    summary="List transactions for a specific user card",
)
async def list_card_transactions(
    card_id: UUID,
    skip: int = 0,
    limit: int = 50,
    current_user: UserResponse = Depends(get_current_user),
    service: TransactionService = Depends(get_transaction_service),
) -> dict:
    results = await service.fetch_card_transactions(card_id, skip, limit)
    return {"data": results, "total": len(results)}


@router.get(
    "/{transaction_id}",
    response_model=SingleResponse[TransactionResponse],
    status_code=status.HTTP_200_OK,
    summary="Get a specific transaction",
)
async def get_transaction(
    transaction_id: UUID,
    current_user: UserResponse = Depends(get_current_user),
    service: TransactionService = Depends(get_transaction_service),
) -> dict:
    try:
        result = await service.get_transaction(transaction_id)
        # Typically we should check if result belongs to current_user here
        if result.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        return {"data": result}
    except TransactionNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.patch(
    "/{transaction_id}/status",
    response_model=SingleResponse[TransactionResponse],
    status_code=status.HTTP_200_OK,
    summary="Update transaction status",
)
async def update_transaction_status(
    transaction_id: UUID,
    request: TransactionUpdateStatus,
    current_user: UserResponse = Depends(get_current_user),
    service: TransactionService = Depends(get_transaction_service),
) -> dict:
    try:
        result = await service.get_transaction(transaction_id)
        if result.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
            
        updated = await service.update_status(transaction_id, request)
        return {"data": updated}
    except TransactionNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except InvalidTransactionError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
