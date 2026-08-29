import json
from decimal import Decimal
from types import SimpleNamespace

from milestones.engine import MilestoneEngine


def test_evaluate_card_milestones_handles_string_json():
    # Test empty string list (like HSBC Live+)
    card = SimpleNamespace(
        card_catalog=SimpleNamespace(milestones_json="[]"),
        current_spend=Decimal("5000.00"),
        annual_spend=Decimal("50000.00"),
    )
    result = MilestoneEngine.evaluate_card_milestones(card, [])
    assert result == []

    # Test string json with milestones
    card_with_ms = SimpleNamespace(
        card_catalog=SimpleNamespace(
            milestones_json=json.dumps({
                "milestones": [
                    {
                        "period": "MONTHLY",
                        "spend_threshold": "10000.00",
                        "bonus_points": 500,
                    }
                ]
            })
        ),
        current_spend=Decimal("5000.00"),
        annual_spend=Decimal("50000.00"),
    )
    result = MilestoneEngine.evaluate_card_milestones(card_with_ms, [])
    assert len(result) == 1
    assert result[0].target_value == Decimal("10000.00")
    assert result[0].current_value == Decimal("5000.00")
    assert not result[0].is_achieved


def test_evaluate_card_milestones_handles_dict_and_list():
    # Test list directly
    card_list = SimpleNamespace(
        card_catalog=SimpleNamespace(
            milestones_json=[
                {
                    "period": "ANNUAL",
                    "spend_threshold": "100000.00",
                    "bonus_points": 10000,
                }
            ]
        ),
        current_spend=Decimal("0.00"),
        annual_spend=Decimal("150000.00"),
    )
    result = MilestoneEngine.evaluate_card_milestones(card_list, [])
    assert len(result) == 1
    assert result[0].is_achieved is True

    # Test dict directly
    card_dict = SimpleNamespace(
        card_catalog=SimpleNamespace(milestones_json={"milestones": []}),
        current_spend=Decimal("0.00"),
        annual_spend=Decimal("0.00"),
    )
    result = MilestoneEngine.evaluate_card_milestones(card_dict, [])
    assert result == []
