"""
Tests: backend/tests/unit/recommendations/test_orchestrator.py
"""

from __future__ import annotations

import random
from decimal import Decimal
from typing import Any
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from merchants.schemas import NormalizeResponse
from recommendations.exceptions import NoCardsError
from recommendations.orchestrator import RecommendationOrchestrator
from recommendations.schemas import RecommendationRequest
from reward_engine.constants import PaymentMode


# ---------------------------------------------------------------------------
# Mocks & Fixtures
# ---------------------------------------------------------------------------

class MockCardDetails:
    def __init__(self, name: str) -> None:
        self.name = name
        self.card_name = name
        self.fee_waiver_spend_threshold = Decimal("100000.00")
        self.annual_fee = Decimal("1000.00")

class MockUserCard:
    def __init__(self, id, name):
        self.id = id
        self.card_catalog_id = id
        self.nickname = name
        self.annual_spend = Decimal("0.00")
        self.card_status = "ACTIVE"
        self.fee_cycle_start_date = None
        self.user_override_annual_fee = None
        self.effective_annual_fee = Decimal("1000.00")
        self.card_catalog = type("MockCatalog", (), {
            "card_name": name,
            "bank_name": "Bank",
            "fee_waiver_spend_threshold": Decimal("100000.00"),
            "annual_fee": Decimal("1000.00")
        })

class MockRewardRule:
    def __init__(self, rule_name: str, rule_type: str, priority: int, config: dict[str, Any]) -> None:
        self.rule_name = rule_name
        self.rule_type = rule_type
        self.priority = priority
        self.rule_config = config


@pytest.fixture
def merchant_service() -> MagicMock:
    svc = MagicMock()
    svc.normalize_merchant.return_value = NormalizeResponse(
        raw_name="dominos",
        canonical_name="dominos pizza",
        tokens=["dominos", "pizza"],
        category="dining",
    )
    return svc


@pytest.fixture
def user_card_service() -> AsyncMock:
    svc = AsyncMock()
    # Default to 2 cards
    c1 = MockUserCard(str(uuid4()), "HDFC Swiggy")
    c2 = MockUserCard(str(uuid4()), "SBI Cashback")
    svc.get_user_cards.return_value = ([c1, c2], 2)
    return svc


@pytest.fixture
def reward_rule_service() -> AsyncMock:
    svc = AsyncMock()
    
    # A generic dining rule for HDFC Swiggy
    r1 = MockRewardRule(
        rule_name="Dining Cashback",
        rule_type="category_bonus",
        priority=10,
        config={
            "reward_type": "cashback",
            "category": "dining",
            "reward_rate": 0.05,
            "min_spend": 0,
            "max_reward": 1000,
            "cap": 1000,
            "points_multiplier": 1,
            "spend_unit": 100,
            "points_per_unit": 1,
            "rupee_value": 1.0,
            "payment_mode": "any",
        },
    )
    # Generic base rule
    r2 = MockRewardRule(
        rule_name="Base Cashback",
        rule_type="base_reward",
        priority=100,
        config={
            "reward_type": "cashback",
            "reward_rate": 0.01,
            "min_spend": 0,
            "max_reward": 1000,
            "cap": 1000,
            "points_multiplier": 1,
            "spend_unit": 100,
            "points_per_unit": 1,
            "rupee_value": 1.0,
            "payment_mode": "any",
        },
    )
    svc.get_card_active_rules.return_value = [r1, r2]
    return svc


@pytest.fixture
def orchestrator(
    merchant_service: MagicMock,
    user_card_service: AsyncMock,
    reward_rule_service: AsyncMock,
) -> RecommendationOrchestrator:
    return RecommendationOrchestrator(
        merchant_service=merchant_service,
        user_card_service=user_card_service,
        reward_rule_service=reward_rule_service,
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_generate_recommendation_success(orchestrator: RecommendationOrchestrator):
    req = RecommendationRequest(
        merchant_name="dominos",
        amount=Decimal("1000"),
        payment_mode=PaymentMode.ONLINE,
    )
    user_id = uuid4()
    
    res = await orchestrator.generate_recommendation(user_id, req)
    
    assert res.normalized_merchant == "dominos pizza"
    assert res.category == "dining"
    assert len(res.ranked_cards) == 2
    assert res.best_card == res.ranked_cards[0].card_name
    
    # Dining matches the 5% category rule (5% of 1000 = 50)
    assert res.ranked_cards[0].effective_reward_value == Decimal("50")
    assert res.ranked_cards[0].recommendation_reason != ""


@pytest.mark.asyncio
async def test_generate_recommendation_no_cards_returns_empty_response(
    orchestrator: RecommendationOrchestrator,
    user_card_service: AsyncMock,
):
    user_card_service.get_user_cards.return_value = ([], 0)
    req = RecommendationRequest(
        merchant_name="dominos",
        amount=Decimal("1000"),
    )
    res = await orchestrator.generate_recommendation(uuid4(), req)
    
    assert res.best_card is None
    assert len(res.ranked_cards) == 0


@pytest.mark.asyncio
async def test_deterministic_invariance(orchestrator: RecommendationOrchestrator):
    """Multiple calls with the same input must produce identical results."""
    req = RecommendationRequest(
        merchant_name="dominos",
        amount=Decimal("500"),
    )
    user_id = uuid4()
    
    results = []
    for _ in range(5):
        res = await orchestrator.generate_recommendation(user_id, req)
        results.append(res)
        
    first = results[0]
    for other in results[1:]:
        assert other.best_card == first.best_card
        assert [c.card_name for c in other.ranked_cards] == [c.card_name for c in first.ranked_cards]
        assert other.explanations == first.explanations
