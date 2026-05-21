"""
Module: backend.transactions.service
Responsibility: Orchestration of transaction use cases.

Architectural Boundaries:
- Orchestrates pure validation, repository persistence, and merchant normalization.
- No DB queries, no reward logic, no recommendation logic.
"""

from typing import Optional
from uuid import UUID

from merchants.service import MerchantService
from transactions.constants import TransactionStatus
from transactions.exceptions import InvalidTransactionError
from transactions.models import Transaction
from transactions.repository import TransactionRepository
from transactions.schemas import TransactionCreate, TransactionResponse, TransactionUpdateStatus
from transactions.validators import validate_status_transition, validate_transaction_dates


class TransactionService:
    """Service facade for the transactions module."""

    def __init__(
        self,
        repository: TransactionRepository,
        merchant_service: MerchantService,
    ) -> None:
        self._repository = repository
        self._merchant_service = merchant_service

    async def create_transaction(
        self, user_id: UUID, schema: TransactionCreate
    ) -> TransactionResponse:
        """Create a new normalized transaction."""
        
        # 1. Pure validation
        validate_transaction_dates(schema.transaction_date, None)
        
        # 2. Merchant Normalization (reusing MerchantService)
        # We don't create the merchant implicitly, we just get the canonical name.
        normalize_res = self._merchant_service.normalize_merchant(schema.merchant_name)
        canonical_name = normalize_res.canonical_name
        category = normalize_res.category or "other"

        # 3. Create Model
        model = Transaction(
            user_id=user_id,
            user_card_id=schema.user_card_id,
            merchant_name=schema.merchant_name,
            normalized_merchant=canonical_name,
            category=category,
            amount=schema.amount,
            currency=schema.currency,
            payment_mode=schema.payment_mode,
            transaction_type=schema.transaction_type,
            transaction_date=schema.transaction_date,
            description=schema.description,
            external_reference=schema.external_reference,
            raw_description=schema.raw_description,
            source=schema.source,
            statement_id=schema.statement_id,
            status=TransactionStatus.PENDING,
        )

        # 4. Persist
        persisted = await self._repository.create_transaction(model)
        return self._to_response(persisted)

    async def get_transaction(self, transaction_id: UUID) -> TransactionResponse:
        """Fetch a specific transaction."""
        entity = await self._repository.get_transaction_by_id(transaction_id)
        return self._to_response(entity)

    async def fetch_user_transactions(
        self, user_id: UUID, skip: int = 0, limit: int = 50
    ) -> list[TransactionResponse]:
        """Fetch transactions for a user."""
        entities = await self._repository.get_transactions_by_user(user_id, skip, limit)
        return [self._to_response(e) for e in entities]

    async def fetch_card_transactions(
        self, user_card_id: UUID, skip: int = 0, limit: int = 50
    ) -> list[TransactionResponse]:
        """Fetch transactions for a specific user card."""
        entities = await self._repository.get_transactions_by_card(user_card_id, skip, limit)
        return [self._to_response(e) for e in entities]

    async def update_status(
        self, transaction_id: UUID, schema: TransactionUpdateStatus
    ) -> TransactionResponse:
        """Update transaction status (append-only style correction)."""
        
        # Fetch current state to validate transition
        current_entity = await self._repository.get_transaction_by_id(transaction_id)
        
        validate_status_transition(current_entity.status, schema.status, schema.posted_date)
        
        if schema.posted_date:
            validate_transaction_dates(current_entity.transaction_date, schema.posted_date)

        updated = await self._repository.update_transaction_status(
            transaction_id, schema.status, schema.posted_date
        )
        return self._to_response(updated)

    @staticmethod
    def _to_response(entity: Transaction) -> TransactionResponse:
        """Convert a Transaction ORM entity to a Pydantic response."""
        return TransactionResponse.model_validate(entity)
