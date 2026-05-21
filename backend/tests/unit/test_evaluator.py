from decimal import Decimal

from reward_engine.constants import CapScope, RewardType
from reward_engine.evaluator import evaluate
from reward_engine.schemas import NormalizedRuleConfig, TransactionContext


def test_evaluate_empty_rules():
    txn = TransactionContext(merchant="amazon", category="shopping", amount=Decimal("100"))
    res = evaluate(txn, [])
    assert res.effective_reward_inr == Decimal("0")
    assert res.reward_type == RewardType.NONE
    assert len(res.breakdown) > 0


def test_evaluate_exclusions_early_exit():
    txn = TransactionContext(merchant="fuel_station", category="fuel", amount=Decimal("1000"))
    rule = NormalizedRuleConfig(
        rule_name="No Fuel",
        rule_type="exclusion",
        config={"category": "fuel"}
    )
    res = evaluate(txn, [rule])
    assert res.is_excluded is True
    assert res.effective_reward_inr == Decimal("0")
    assert any(step.step == "exclusions" for step in res.breakdown)


def test_evaluate_cashback():
    txn = TransactionContext(merchant="amazon", category="shopping", amount=Decimal("1000"))
    rule = NormalizedRuleConfig(
        rule_name="10% Cashback",
        rule_type="merchant_bonus",
        config={"merchant": "amazon", "reward_rate": 0.10, "reward_type": "cashback"}
    )
    res = evaluate(txn, [rule])
    assert res.is_excluded is False
    assert res.reward_type == RewardType.CASHBACK
    assert res.effective_reward_inr == Decimal("100")
    assert res.cashback_amount == Decimal("100")


def test_evaluate_points_with_fractional_cap():
    txn = TransactionContext(merchant="amazon", category="shopping", amount=Decimal("1000"))
    rule = NormalizedRuleConfig(
        rule_name="Points Rule",
        rule_type="merchant_bonus",
        config={
            "merchant": "amazon",
            "reward_type": "points",
            "spend_unit": 100,
            "points_per_unit": 2,
            "rupee_value": 0.25,
            # 1000 / 100 * 2 = 20 points = 5 INR.
            "caps": [
                {
                    "cap_type": "transaction_cap",
                    "limit": 2.50, # cap at 2.50 INR. This should halve the points to 10.
                    "scope": "per_transaction"
                }
            ]
        }
    )
    res = evaluate(txn, [rule])
    assert res.reward_type == RewardType.POINTS
    assert res.effective_reward_inr == Decimal("2.5")
    assert res.point_value_inr == Decimal("2.5")
    assert res.reward_points == 10  # Scaled down from 20 due to cap
    assert res.cap_result is not None
    assert res.cap_result.was_capped is True


def test_evaluate_unsupported_reward_type():
    txn = TransactionContext(merchant="amazon", category="shopping", amount=Decimal("1000"))
    rule = NormalizedRuleConfig(
        rule_name="Miles Rule",
        rule_type="merchant_bonus",
        config={"merchant": "amazon", "reward_type": "miles"}
    )
    res = evaluate(txn, [rule])
    assert res.effective_reward_inr == Decimal("0")
    assert res.reward_type == RewardType("miles")
    assert any("not yet implemented" in w for w in res.warnings)

