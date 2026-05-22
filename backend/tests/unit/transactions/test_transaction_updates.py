import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
from decimal import Decimal
from datetime import date

from transactions.service import TransactionService
from transactions.schemas import TransactionUpdate
from transactions.models import Transaction

@pytest.mark.asyncio
async def test_update_transaction_card_change():
    """Verify that changing a card triggers aggregation on both old and new cards."""
    # Setup mocks
    repo_mock = AsyncMock()
    merchant_mock = MagicMock()
    spend_aggregator_mock = AsyncMock()
    
    old_card_id = uuid4()
    new_card_id = uuid4()
    transaction_id = uuid4()
    
    # Existing transaction
    existing_txn = Transaction(
        id=transaction_id,
        user_id=uuid4(),
        user_card_id=old_card_id,
        merchant_name="Amazon",
        normalized_merchant="Amazon",
        category="other",
        amount=Decimal("100.00"),
        transaction_date=date.today(),
        status="pending"
    )
    repo_mock.get_transaction_by_id.return_value = existing_txn
    repo_mock.update_transaction.return_value = existing_txn
    
    service = TransactionService(repo_mock, merchant_mock, spend_aggregator_mock)
    
    # Update payload
    update_payload = TransactionUpdate(
        user_card_id=new_card_id,
        amount=Decimal("150.00")
    )
    
    # Execute
    await service.update_transaction(transaction_id, update_payload)
    
    # Verify aggregation was called for both cards
    assert spend_aggregator_mock.recalculate_card_spend.call_count == 2
    
    # Get all calls to recalculate_card_spend
    calls = spend_aggregator_mock.recalculate_card_spend.call_args_list
    called_ids = [call[0][0] for call in calls]
    
    assert old_card_id in called_ids
    assert new_card_id in called_ids
