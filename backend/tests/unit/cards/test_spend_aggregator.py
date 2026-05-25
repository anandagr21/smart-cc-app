import pytest
from uuid import uuid4
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

from cards.intelligence.spend_aggregator import SpendAggregator
from transactions.constants import TransactionStatus, TransactionType

@pytest.mark.asyncio
async def test_recalculate_card_spend_success():
    """Test that it correctly sums PURCHASE transactions that are PENDING or POSTED."""
    # Setup mocks
    session_mock = AsyncMock()
    
    # Mock finding the card
    mock_card = MagicMock()
    mock_card.id = uuid4()
    mock_card.current_spend = Decimal("0.00")
    mock_card.annual_spend = Decimal("0.00")
    
    session_mock.get.return_value = mock_card
    
    # Mock the query result returning 1500.50 sum
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = Decimal("1500.50")
    session_mock.execute.return_value = mock_result
    
    # Execute
    aggregator = SpendAggregator(session_mock)
    updated_card = await aggregator.recalculate_card_spend(mock_card.id)
    
    # Verify the sum was applied
    assert updated_card.current_spend == Decimal("1500.50")
    assert updated_card.annual_spend == Decimal("1500.50")
    
    # Verify commit flow
    session_mock.add.assert_called_with(mock_card)
    session_mock.commit.assert_called_once()
    session_mock.refresh.assert_called_with(mock_card)

@pytest.mark.asyncio
async def test_recalculate_card_spend_not_found():
    """Test that it raises ValueError if card doesn't exist."""
    session_mock = AsyncMock()
    session_mock.get.return_value = None
    
    aggregator = SpendAggregator(session_mock)
    
    with pytest.raises(ValueError, match="not found"):
        await aggregator.recalculate_card_spend(uuid4())
