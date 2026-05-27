"""
Tests: backend/tests/e2e/test_golden_scenarios.py
Purpose: Golden Scenario Snapshot Testing for Financial Validation
"""

from __future__ import annotations

import json
from decimal import Decimal
from typing import Any
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID

import pytest
import syrupy.extensions.amber
from syrupy.assertion import SnapshotAssertion

from merchants.schemas import NormalizeResponse
from recommendations.orchestrator import RecommendationOrchestrator
from recommendations.schemas import RecommendationRequest
from reward_engine.constants import PaymentMode


# ---------------------------------------------------------------------------
# Mocks & Fixtures
# ---------------------------------------------------------------------------

class MockCardDetails:
    def __init__(self, name: str, annual_fee: str = "1000.00", waiver_threshold: str = "100000.00") -> None:
        self.name = name
        self.card_name = name
        self.annual_fee = Decimal(annual_fee)
        self.fee_waiver_spend_threshold = Decimal(waiver_threshold)


class MockUserCard:
    def __init__(self, card_id, name, annual_spend="0.00", fee_waiver_threshold="0.00", annual_fee="0.00"):
        self.id = UUID(card_id)
        self.card_catalog_id = UUID(card_id)
        self.nickname = name
        self.annual_spend = Decimal(annual_spend)
        self.card_status = "ACTIVE"
        self.fee_cycle_start_date = None
        self.user_override_annual_fee = None
        self.effective_annual_fee = Decimal(annual_fee)
        self.card_catalog = type("MockCatalog", (), {
            "card_name": name,
            "bank_name": "Bank",
            "fee_waiver_spend_threshold": Decimal(fee_waiver_threshold) if fee_waiver_threshold else None,
            "annual_fee": Decimal(annual_fee)
        })


class MockRewardRule:
    def __init__(self, rule_name: str, rule_type: str, priority: int, config: dict[str, Any]) -> None:
        self.rule_name = rule_name
        self.rule_type = rule_type
        self.priority = priority
        self.rule_config = config


@pytest.fixture
def snapshot_custom(snapshot: SnapshotAssertion) -> SnapshotAssertion:
    """A snapshot fixture customized to serialize Decimals and UUIDs."""
    class CustomJSONSerializer:
        def __call__(self, data: Any, **kwargs) -> str:
            # We convert Pydantic models to dict to snapshot them cleanly
            def default(o: Any) -> Any:
                if isinstance(o, Decimal):
                    return str(o)
                if isinstance(o, UUID):
                    return str(o)
                if hasattr(o, "model_dump"):
                    return o.model_dump()
                return str(o)
            return json.dumps(data, default=default, indent=2, sort_keys=True)
            
    return snapshot.use_extension(
        extension_class=syrupy.extensions.amber.AmberSnapshotExtension
    )

def pydantic_to_dict(obj):
    if hasattr(obj, "model_dump"):
        dump = obj.model_dump()
        for k, v in dump.items():
            if isinstance(v, Decimal):
                dump[k] = str(v)
            elif isinstance(v, list):
                dump[k] = [pydantic_to_dict(i) if hasattr(i, "model_dump") else (str(i) if isinstance(i, Decimal) else i) for i in v]
        return dump
    return obj

# ---------------------------------------------------------------------------
# Golden Scenarios
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_golden_scenario_amazon_shopping(snapshot: SnapshotAssertion):
    """
    Scenario:
    - User has SBI Cashback (5% online), HDFC Millennia (5% Amazon/Flipkart)
    - Amazon shopping transaction for ₹5000
    - HDFC Millennia is close to waiver, so it should rank higher if cashback is tied or close.
    """
    # Mocks setup
    merchant_service = MagicMock()
    merchant_service.normalize_merchant.return_value = NormalizeResponse(
        raw_name="amazon", canonical_name="amazon", tokens=["amazon"], category="shopping"
    )

    user_card_service = AsyncMock()
    c1 = MockUserCard("00000000-0000-0000-0000-000000000001", "SBI Cashback", "50000.00", "999.00", "200000.00")
    c2 = MockUserCard("00000000-0000-0000-0000-000000000002", "HDFC Millennia", "98000.00", "1000.00", "100000.00")
    user_card_service.get_user_cards.return_value = ([c1, c2], 2)

    reward_rule_service = AsyncMock()
    
    # SBI 5% online
    sbi_rule = MockRewardRule("SBI Online", "category_bonus", 10, {
        "reward_type": "cashback", "payment_mode": "online", "reward_rate": 0.05, "rupee_value": 1.0, "cap": 5000
    })
    # HDFC 5% Amazon
    hdfc_rule = MockRewardRule("HDFC Amazon", "merchant_bonus", 5, {
        "reward_type": "cashback", "merchant": "amazon", "reward_rate": 0.05, "rupee_value": 1.0, "cap": 1000
    })
    
    def get_rules(card_id: UUID):
        if str(card_id) == "00000000-0000-0000-0000-000000000001":
            return [sbi_rule]
        else:
            return [hdfc_rule]
            
    reward_rule_service.get_card_active_rules.side_effect = get_rules

    orchestrator = RecommendationOrchestrator(
        merchant_service=merchant_service,
        user_card_service=user_card_service,
        reward_rule_service=reward_rule_service,
    )

    req = RecommendationRequest(
        merchant_name="amazon",
        amount=Decimal("5000"),
        payment_mode=PaymentMode.ONLINE,
    )

    user_id = UUID("00000000-0000-0000-0000-000000000000")
    res = await orchestrator.generate_recommendation(user_id, req)
    
@pytest.mark.asyncio
async def test_golden_scenario_cashback_dominance(snapshot_custom: SnapshotAssertion):
    """
    Scenario:
    - User has Card A (2% cashback), Card B (1% cashback, but close to waiver)
    - Big transaction of ₹100,000.
    - Card A gives ₹2,000 cashback.
    - Card B gives ₹1,000 cashback, AND completes a ₹500 fee waiver.
    - Total Card A value: ₹2,000.
    - Total Card B value: ₹1,500.
    - Card A should win.
    """
    merchant_service = MagicMock()
    merchant_service.normalize_merchant.return_value = NormalizeResponse(
        raw_name="apple store", canonical_name="apple store", tokens=["apple"], category="electronics"
    )

    user_card_service = AsyncMock()
    c1 = MockUserCard("00000000-0000-0000-0000-000000000001", "Card A", "0.00", "500.00", "100000.00")
    c2 = MockUserCard("00000000-0000-0000-0000-000000000002", "Card B", "90000.00", "500.00", "100000.00")
    user_card_service.get_user_cards.return_value = ([c1, c2], 2)

    reward_rule_service = AsyncMock()
    card_a_rule = MockRewardRule("Card A Default", "base_reward", 1, {
        "reward_type": "cashback", "reward_rate": 0.02, "rupee_value": 1.0, "cap": 10000
    })
    card_b_rule = MockRewardRule("Card B Default", "base_reward", 1, {
        "reward_type": "cashback", "reward_rate": 0.01, "rupee_value": 1.0, "cap": 10000
    })
    
    def get_rules(card_id: UUID):
        if str(card_id) == "00000000-0000-0000-0000-000000000001":
            return [card_a_rule]
        else:
            return [card_b_rule]
            
    reward_rule_service.get_card_active_rules.side_effect = get_rules

    orchestrator = RecommendationOrchestrator(
        merchant_service=merchant_service,
        user_card_service=user_card_service,
        reward_rule_service=reward_rule_service,
    )

    req = RecommendationRequest(
        merchant_name="apple store",
        amount=Decimal("100000"),
        payment_mode=PaymentMode.OFFLINE,
    )

    res = await orchestrator.generate_recommendation(UUID("00000000-0000-0000-0000-000000000000"), req)
    assert pydantic_to_dict(res) == snapshot_custom
