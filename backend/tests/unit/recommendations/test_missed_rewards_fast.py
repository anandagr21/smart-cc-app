import asyncio
from decimal import Decimal
import uuid
import pytest
from insights.enrichment.transaction_enrichment import EnrichedTransaction
from insights.generators.missed_rewards import MissedRewardsGenerator
from insights.schemas import InsightCategory, InsightPriority


class MockCatalogCard:
    def __init__(self, card_name: str, rules_json: list):
        self.id = uuid.uuid4()
        self.card_name = card_name
        self.reward_rules_json = rules_json
        self.fee_waiver_spend_threshold = Decimal("100000")
        self.annual_fee = Decimal("500")


class MockUserCard:
    def __init__(self, name: str, rate: float, category: str):
        self.id = uuid.uuid4()
        self.card_catalog_id = uuid.uuid4()
        self.nickname = name
        self.card_status = "ACTIVE"
        self.annual_spend = Decimal("10000")
        self.effective_annual_fee = Decimal("500")
        self.fee_cycle_start_date = None
        self.user_override_annual_fee = None
        self.card_catalog = MockCatalogCard(
            card_name=name,
            rules_json=[{
                "category_name": category,
                "reward_type": "cashback",
                "cashback_percent": rate,
                "cap": 5000,
            }]
        )


def test_missed_rewards_pure_in_memory_evaluation():
    # Card A: 5% on dining
    card_a = MockUserCard("Super Dining Card", 5.0, "dining")
    # Card B: 1% on dining
    card_b = MockUserCard("Basic Card", 1.0, "dining")

    # Transaction for Rs. 10,000 on dining using Card B (earned Rs. 100)
    # Card A would have earned Rs. 500 -> delta = Rs. 400
    tx = EnrichedTransaction(
        id="tx_123",
        original_merchant_name="Swiggy",
        amount=10000.0,
        normalized_merchant_name="Swiggy",
        category="dining",
        date="2026-09-10",
        card_id=str(card_b.id),
    )

    gen = MissedRewardsGenerator()
    insights = gen.generate(str(uuid.uuid4()), [card_a, card_b], [tx])

    assert len(insights) == 1
    ins = insights[0]
    assert ins.category == InsightCategory.MISSED_REWARDS
    assert ins.related_card_id == str(card_a.id)
    assert ins.monetary_value == 400.0
    assert ins.priority == InsightPriority.MEDIUM
    assert "Super Dining Card" in ins.summary


@pytest.mark.asyncio
async def test_missed_rewards_async_fast_path():
    card_a = MockUserCard("Super Dining Card", 10.0, "dining")
    card_b = MockUserCard("Basic Card", 1.0, "dining")

    # Transaction for Rs. 10,000 on dining using Card B
    # Delta = 1000 - 100 = 900 (> 500 -> HIGH priority)
    tx = EnrichedTransaction(
        id="tx_456",
        original_merchant_name="Zomato",
        amount=10000.0,
        normalized_merchant_name="Zomato",
        category="dining",
        date="2026-09-12",
        card_id=str(card_b.id),
    )

    gen = MissedRewardsGenerator()
    insights = await gen.generate_async(str(uuid.uuid4()), [card_a, card_b], [tx])

    assert len(insights) == 1
    assert insights[0].priority == InsightPriority.HIGH
    assert insights[0].monetary_value == 900.0


def test_missed_rewards_below_threshold_ignored():
    card_a = MockUserCard("Card A", 0.02, "grocery")
    card_b = MockUserCard("Card B", 0.01, "grocery")

    # Transaction for Rs. 1,000 -> delta = 20 - 10 = Rs. 10 (< Rs. 50 threshold)
    tx = EnrichedTransaction(
        id="tx_small",
        original_merchant_name="Blinkit",
        amount=1000.0,
        normalized_merchant_name="Blinkit",
        category="grocery",
        date="2026-09-13",
        card_id=str(card_b.id),
    )

    gen = MissedRewardsGenerator()
    insights = gen.generate(str(uuid.uuid4()), [card_a, card_b], [tx])

    assert len(insights) == 0


@pytest.mark.asyncio
async def test_recommendation_batch_evaluation():
    from unittest.mock import AsyncMock, MagicMock
    from recommendations.orchestrator import RecommendationOrchestrator
    from recommendations.schemas import RecommendationRequest
    from merchants.schemas import NormalizeResponse

    card_a = MockUserCard("Super Dining Card", 5.0, "dining")
    card_b = MockUserCard("Basic Card", 1.0, "dining")

    mock_merchant_service = MagicMock()
    mock_merchant_service.normalize_merchant.return_value = NormalizeResponse(
        raw_name="Swiggy",
        canonical_name="Swiggy",
        tokens=["swiggy"],
        category="dining",
    )

    mock_card_service = AsyncMock()
    mock_card_service.get_user_cards.return_value = ([card_a, card_b], 2)

    mock_rule_service = AsyncMock()

    orchestrator = RecommendationOrchestrator(
        merchant_service=mock_merchant_service,
        user_card_service=mock_card_service,
        reward_rule_service=mock_rule_service,
    )

    requests = [
        RecommendationRequest(merchant_name="Swiggy", amount=Decimal("1000"), skip_resolution=True),
        RecommendationRequest(merchant_name="Zomato", amount=Decimal("2000"), skip_resolution=True),
    ]

    results = await orchestrator.generate_recommendations_batch(uuid.uuid4(), requests)
    assert len(results) == 2
    assert results[0].all_ranked_cards[0].card_name == "Super Dining Card"
    assert results[1].all_ranked_cards[0].card_name == "Super Dining Card"
    # User card service called only once for entire batch!
    assert mock_card_service.get_user_cards.call_count == 1


@pytest.mark.asyncio
async def test_behavior_analytics_in_memory():
    from datetime import date
    from monthly_intelligence.analytics.behavior_analytics import BehaviorAnalyticsEngine
    from transactions.models import Transaction

    card_a = MockUserCard("Super Dining Card", 5.0, "dining")
    card_b = MockUserCard("Basic Card", 1.0, "dining")

    tx1 = Transaction(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        user_card_id=card_a.id,
        merchant_name="Swiggy",
        normalized_merchant="Swiggy",
        category="dining",
        amount=Decimal("1000"),
        transaction_date=date(2026, 9, 10),
    )
    tx2 = Transaction(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        user_card_id=card_b.id,
        merchant_name="Zomato",
        normalized_merchant="Zomato",
        category="dining",
        amount=Decimal("1000"),
        transaction_date=date(2026, 9, 12),
    )

    engine = BehaviorAnalyticsEngine()
    metrics = await engine.compute_monthly_metrics(uuid.uuid4(), [tx1, tx2], [card_a, card_b])

    assert metrics["transaction_count"] == 2
    assert metrics["total_spent"] == 2000.0
    assert metrics["strongest_category"] == "dining"
    assert metrics["optimization_rate"] == 50.0  # 1 was optimized (card_a), 1 missed (card_b)
    assert metrics["missed_opportunity_value"] > 0


