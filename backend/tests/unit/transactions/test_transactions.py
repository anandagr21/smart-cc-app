"""
Tests: backend/tests/unit/transactions/test_transactions.py
"""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from pydantic import ValidationError

from merchants.schemas import NormalizeResponse
from transactions.constants import Currency, TransactionStatus, TransactionType
from transactions.exceptions import InvalidTransactionError, TransactionNotFoundError
from transactions.models import Transaction
from transactions.schemas import TransactionCreate, TransactionUpdateStatus
from transactions.service import TransactionService
from transactions.validators import validate_status_transition, validate_transaction_dates


# ---------------------------------------------------------------------------
# Validation Tests
# ---------------------------------------------------------------------------

def test_pydantic_amount_must_be_positive():
    with pytest.raises(ValidationError):
        TransactionCreate(
            user_card_id=uuid4(),
            merchant_name="Amazon",
            amount=Decimal("-10.0"),  # Negative
            transaction_date=date.today(),
        )

def test_validate_dates():
    today = date.today()
    future = today + timedelta(days=5)
    past = today - timedelta(days=5)

    # Future transaction date fails
    with pytest.raises(InvalidTransactionError, match="in the future"):
        validate_transaction_dates(future, None)
        
    # Posted date before transaction date fails
    with pytest.raises(InvalidTransactionError, match="cannot be before"):
        validate_transaction_dates(today, past)


def test_validate_status_transition():
    # Cannot update a reversed transaction
    with pytest.raises(InvalidTransactionError, match="update a reversed transaction"):
        validate_status_transition(TransactionStatus.REVERSED, TransactionStatus.PENDING, None)
        
    # Posted status requires posted_date
    with pytest.raises(InvalidTransactionError, match="Posted date is required"):
        validate_status_transition(TransactionStatus.PENDING, TransactionStatus.POSTED, None)


# ---------------------------------------------------------------------------
# Service / Deterministic Tests
# ---------------------------------------------------------------------------

@pytest.fixture
def merchant_service() -> MagicMock:
    svc = MagicMock()
    # Mock purely deterministic normalization
    def mock_normalize(raw_name: str):
        canonical = raw_name.lower().strip()
        category = "dining" if "pizza" in canonical else "shopping"
        return NormalizeResponse(
            raw_name=raw_name,
            canonical_name=canonical,
            tokens=canonical.split(),
            category=category,
        )
    svc.normalize_merchant.side_effect = mock_normalize
    return svc


@pytest.fixture
def repo() -> AsyncMock:
    r = AsyncMock()
    # Mock create to return the passed entity
    async def mock_create(txn):
        txn.id = uuid4()
        return txn
    r.create_transaction.side_effect = mock_create
    return r


@pytest.fixture
def service(repo: AsyncMock, merchant_service: MagicMock) -> TransactionService:
    return TransactionService(repository=repo, merchant_service=merchant_service)


@pytest.mark.asyncio
async def test_deterministic_normalization(service: TransactionService, repo: AsyncMock):
    """Ensure identical raw merchants always produce identical normalized data."""
    req1 = TransactionCreate(
        user_card_id=uuid4(),
        merchant_name="  DOMINOS PIZZA ",
        amount=Decimal("100"),
        transaction_date=date.today(),
    )
    req2 = TransactionCreate(
        user_card_id=uuid4(),
        merchant_name="dominos pizza",
        amount=Decimal("100"),
        transaction_date=date.today(),
    )
    
    user_id = uuid4()
    res1 = await service.create_transaction(user_id, req1)
    res2 = await service.create_transaction(user_id, req2)
    
    assert res1.normalized_merchant == res2.normalized_merchant == "dominos pizza"
    assert res1.category == res2.category == "dining"


@pytest.mark.asyncio
async def test_future_proof_fields_preserved(service: TransactionService, repo: AsyncMock):
    req = TransactionCreate(
        user_card_id=uuid4(),
        merchant_name="Amazon",
        amount=Decimal("100"),
        transaction_date=date.today(),
        raw_description="AMZ*STORE 1234",
        source="statement_parser",
        statement_id=uuid4(),
    )
    
    res = await service.create_transaction(uuid4(), req)
    assert res.raw_description == "AMZ*STORE 1234"
    assert res.source == "statement_parser"
    assert res.statement_id == req.statement_id


@pytest.mark.asyncio
async def test_update_status(service: TransactionService, repo: AsyncMock):
    txn_id = uuid4()
    
    # Mock current state
    current_txn = Transaction(
        id=txn_id,
        user_id=uuid4(),
        user_card_id=uuid4(),
        merchant_name="Amazon",
        normalized_merchant="amazon",
        category="shopping",
        amount=Decimal("100"),
        transaction_date=date.today() - timedelta(days=2),
        status=TransactionStatus.PENDING,
    )
    repo.get_transaction_by_id.return_value = current_txn
    
    # Mock updated state
    async def mock_update(t_id, status, p_date):
        current_txn.status = status
        current_txn.posted_date = p_date
        return current_txn
    repo.update_transaction_status.side_effect = mock_update
    
    req = TransactionUpdateStatus(
        status=TransactionStatus.POSTED,
        posted_date=date.today(),
    )
    
    res = await service.update_status(txn_id, req)
    assert res.status == TransactionStatus.POSTED
    assert res.posted_date == date.today()


@pytest.mark.asyncio
async def test_missing_idempotency_key_generates_uuid(service: TransactionService, repo: AsyncMock):
    user_id = uuid4()
    req1 = TransactionCreate(
        user_card_id=uuid4(),
        merchant_name="Starbucks",
        amount=Decimal("5.00"),
        transaction_date=date.today(),
    )
    req2 = TransactionCreate(
        user_card_id=req1.user_card_id,
        merchant_name="Starbucks",
        amount=Decimal("5.00"),
        transaction_date=date.today(),
    )
    
    async def mock_get_idemp(u_id, key):
        return None
        
    repo.get_transaction_by_idempotency_key.side_effect = mock_get_idemp
    
    async def mock_create(txn):
        txn.id = uuid4()
        return txn
        
    repo.create_transaction.side_effect = mock_create

    res1 = await service.create_transaction(user_id, req1)
    res2 = await service.create_transaction(user_id, req2)

    assert res1.id != res2.id
    assert repo.create_transaction.call_count == 2
    
    # Check that fallback is a valid UUID
    from uuid import UUID
    assert UUID(res1.idempotency_key)
    assert UUID(res2.idempotency_key)
    assert res1.idempotency_key != res2.idempotency_key

@pytest.mark.asyncio
async def test_create_transaction_explicit_idempotency(service: TransactionService, repo: AsyncMock):
    user_id = uuid4()
    req1 = TransactionCreate(
        user_card_id=uuid4(),
        merchant_name="Starbucks",
        amount=Decimal("5.00"),
        transaction_date=date.today(),
        idempotency_key="custom_key_1"
    )
    req2 = TransactionCreate(
        user_card_id=req1.user_card_id,
        merchant_name="Starbucks",
        amount=Decimal("5.00"),
        transaction_date=date.today(),
        idempotency_key="custom_key_2"
    )
    
    persisted_keys = set()
    async def mock_get_idemp(u_id, key):
        return None
        
    repo.get_transaction_by_idempotency_key.side_effect = mock_get_idemp
    
    async def mock_create(txn):
        txn.id = uuid4()
        persisted_keys.add(txn.idempotency_key)
        return txn
        
    repo.create_transaction.side_effect = mock_create

    res1 = await service.create_transaction(user_id, req1)
    res2 = await service.create_transaction(user_id, req2)

    assert res1.id != res2.id
    assert repo.create_transaction.call_count == 2
    assert "custom_key_1" in persisted_keys
    assert "custom_key_2" in persisted_keys

@pytest.mark.asyncio
async def test_concurrent_integrity_error_handling(service: TransactionService, repo: AsyncMock):
    from sqlalchemy.exc import IntegrityError
    
    user_id = uuid4()
    req = TransactionCreate(
        user_card_id=uuid4(),
        merchant_name="Starbucks",
        amount=Decimal("5.00"),
        transaction_date=date.today(),
    )
    
    existing_txn = Transaction(
        id=uuid4(),
        user_id=user_id,
        user_card_id=req.user_card_id,
        merchant_name=req.merchant_name,
        normalized_merchant="starbucks",
        category="dining",
        amount=req.amount,
        transaction_date=req.transaction_date,
        status=TransactionStatus.PENDING,
    )
    
    call_count = 0
    async def mock_get_idemp(u_id, key):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return None
        else:
            return existing_txn
            
    repo.get_transaction_by_idempotency_key.side_effect = mock_get_idemp
    
    # Mock IntegrityError
    repo.create_transaction.side_effect = IntegrityError("statement", "params", "orig")
    
    res = await service.create_transaction(user_id, req)
    
    assert res.id == existing_txn.id
    assert repo.create_transaction.call_count == 1
    assert call_count == 2


# ---------------------------------------------------------------------------
# Aggregation Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_aggregation_sums():
    from transactions.aggregations import TransactionAggregator
    
    session = AsyncMock()
    # Mock result of a scalar sum query
    mock_result = MagicMock()
    mock_result.scalar.return_value = Decimal("450.50")
    session.execute.return_value = mock_result
    
    aggregator = TransactionAggregator(session=session)
    
    # Test total spend by card
    total_card = await aggregator.get_total_spend_by_card(uuid4())
    assert total_card == Decimal("450.50")
    
    # Test total spend by category
    total_cat = await aggregator.get_total_spend_by_category(uuid4(), "dining")
    assert total_cat == Decimal("450.50")
    
    # Test monthly spend
    total_monthly = await aggregator.get_monthly_spend(uuid4(), 2023, 10)
    assert total_monthly == Decimal("450.50")
    
    # Verify execute was called 3 times
    assert session.execute.call_count == 3
