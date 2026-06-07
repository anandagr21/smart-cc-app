"""
Module: backend.transactions.service
Responsibility: Orchestration of transaction use cases.

Architectural Boundaries:
- Orchestrates pure validation, repository persistence, and merchant normalization.
- No DB queries, no reward logic, no recommendation logic.
"""

from datetime import date
from typing import Optional
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from merchants.service import MerchantService
from transactions.constants import TransactionStatus
from transactions.exceptions import InvalidTransactionError
from transactions.models import Transaction
from transactions.repository import TransactionRepository
from transactions.schemas import TransactionCreate, TransactionResponse, TransactionUpdateStatus, TransactionUpdate
from transactions.validators import validate_status_transition, validate_transaction_dates

from cards.intelligence.spend_aggregator import SpendAggregator


class TransactionService:
    """Service facade for the transactions module."""

    def __init__(
        self,
        repository: TransactionRepository,
        merchant_service: MerchantService,
        spend_aggregator: 'SpendAggregator' = None,
    ) -> None:
        self._repository = repository
        self._merchant_service = merchant_service
        self._spend_aggregator = spend_aggregator

    async def create_transaction(
        self, user_id: UUID, schema: TransactionCreate
    ) -> TransactionResponse:
        """Create a new normalized transaction."""
        
        # 1. Pure validation
        validate_transaction_dates(schema.transaction_date, None)
        
        # 1.5 Idempotency check
        if schema.idempotency_key:
            existing = await self._repository.get_transaction_by_idempotency_key(user_id, schema.idempotency_key)
            if existing:
                return self._to_response(existing)
        
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
            idempotency_key=schema.idempotency_key,
            status=TransactionStatus.PENDING,
        )

        # 4. Persist
        try:
            persisted = await self._repository.create_transaction(model)
        except IntegrityError:
            # Handle race condition where another request inserted it concurrently
            if schema.idempotency_key:
                existing = await self._repository.get_transaction_by_idempotency_key(user_id, schema.idempotency_key)
                if existing:
                    return self._to_response(existing)
            raise
        
        # 5. Sync derived aggregates
        if self._spend_aggregator:
            await self._spend_aggregator.recalculate_card_spend(schema.user_card_id)
            
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
        
        if self._spend_aggregator:
            await self._spend_aggregator.recalculate_card_spend(updated.user_card_id)
            
        return self._to_response(updated)

    async def update_transaction(
        self, transaction_id: UUID, schema: "TransactionUpdate"  # Import added later
    ) -> TransactionResponse:
        """Fully update a transaction, ensuring aggregates stay synchronized."""
        
        transaction = await self._repository.get_transaction_by_id(transaction_id)
        
        old_card_id = transaction.user_card_id
        
        # We handle partial update manually
        update_data = schema.model_dump(exclude_unset=True)
        
        if "transaction_date" in update_data:
            validate_transaction_dates(update_data["transaction_date"], transaction.posted_date)
            
        if "merchant_name" in update_data and update_data["merchant_name"] != transaction.merchant_name:
            # Re-normalize
            normalize_res = self._merchant_service.normalize_merchant(update_data["merchant_name"])
            update_data["normalized_merchant"] = normalize_res.canonical_name
            update_data["category"] = normalize_res.category or "other"
            
        for field, value in update_data.items():
            setattr(transaction, field, value)
            
        updated = await self._repository.update_transaction(transaction)
        
        if self._spend_aggregator:
            # If card changed, recalculate both old and new
            if "user_card_id" in update_data and old_card_id != updated.user_card_id:
                await self._spend_aggregator.recalculate_card_spend(old_card_id)
            await self._spend_aggregator.recalculate_card_spend(updated.user_card_id)
            
        return self._to_response(updated)

    async def fetch_raw_transactions(
        self, user_id: UUID, skip: int = 0, limit: int = 200
    ) -> list[Transaction]:
        """Fetch raw Transaction ORM entities for internal engine consumption."""
        return await self._repository.get_transactions_by_user(user_id, skip=skip, limit=limit)

    async def fetch_raw_transactions_by_date(
        self, user_id: UUID, start_date: date, end_date: date
    ) -> list[Transaction]:
        """Fetch raw Transaction ORM entities within a date range."""
        return await self._repository.get_transactions_by_date_range(user_id, start_date, end_date)

    @staticmethod
    def _to_response(entity: Transaction) -> TransactionResponse:
        """Convert a Transaction ORM entity to a Pydantic response."""
        return TransactionResponse.model_validate(entity)

    async def delete_transaction(self, transaction_id: UUID) -> None:
        """Delete a transaction and recalculate aggregates."""
        transaction = await self._repository.get_transaction_by_id(transaction_id)
        
        await self._repository.delete_transaction(transaction)
        
        if self._spend_aggregator:
            await self._spend_aggregator.recalculate_card_spend(transaction.user_card_id)
