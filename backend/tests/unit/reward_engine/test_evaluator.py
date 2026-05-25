"""
Tests: backend/tests/unit/reward_engine/test_evaluator.py

Covers:
  - Empty rules → zero result
  - No matching rule → zero result with warning
  - Exclusions → early exit, is_excluded=True
  - Exclusion takes precedence over bonus rules
  - Cashback: basic, percentage, flat, zero-rate
  - Points: basic calculation, zero points
  - Fractional point scaling under cap
  - Cap reduces to zero
  - No cap config → uncapped passthrough
  - Unsupported reward type → warning, zero result
  - Audit trail (breakdown steps present and ordered)
  - Deterministic invariance: same inputs → same result across 10 calls
  - Shuffle invariance: shuffled rule list → same winner
"""

from decimal import Decimal
import random

import pytest

from reward_engine.constants import RewardType
from reward_engine.evaluator import evaluate
from reward_engine.schemas import NormalizedRuleConfig, TransactionContext


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_txn(
    merchant: str = "amazon",
    category: str = "shopping",
    amount: str = "1000",
    cumulative_spend: str = "0",
    payment_mode: str = "any",
    transaction_date: str | None = None,
) -> TransactionContext:
    return TransactionContext(
        merchant=merchant,
        category=category,
        amount=Decimal(amount),
        cumulative_spend=Decimal(cumulative_spend),
        payment_mode=payment_mode,
        transaction_date=transaction_date,
    )


def _bonus_rule(
    name: str,
    *,
    rule_type: str = "merchant_bonus",
    priority: int = 0,
    reward_type: str = "cashback",
    rate: float = 0.10,
    merchant: str | None = None,
    category: str | None = None,
    extra: dict | None = None,
) -> NormalizedRuleConfig:
    cfg: dict = {"reward_rate": rate, "reward_type": reward_type}
    if merchant is not None:
        cfg["merchant"] = merchant
    if category is not None:
        cfg["category"] = category
    if extra:
        cfg.update(extra)
    return NormalizedRuleConfig(rule_name=name, rule_type=rule_type, priority=priority, config=cfg)


def _exclusion_rule(name: str, *, category: str | None = None, merchant: str | None = None) -> NormalizedRuleConfig:
    cfg: dict = {}
    if category:
        cfg["category"] = category
    if merchant:
        cfg["merchant"] = merchant
    return NormalizedRuleConfig(rule_name=name, rule_type="exclusion", config=cfg)


# ---------------------------------------------------------------------------
# Zero / no-match cases
# ---------------------------------------------------------------------------


def test_empty_rules_returns_zero():
    txn = _make_txn()
    res = evaluate(txn, [])
    assert res.effective_reward_inr == Decimal("0")
    assert res.reward_type == RewardType.NONE
    assert res.is_excluded is False
    assert res.matched_rule is None


def test_no_matching_bonus_rule_returns_zero():
    txn = _make_txn(merchant="swiggy", category="food")
    rule = _bonus_rule("Amazon Bonus", merchant="amazon", rate=0.10)
    res = evaluate(txn, [rule])
    assert res.effective_reward_inr == Decimal("0")
    assert res.reward_type == RewardType.NONE
    assert res.matched_rule is None
    assert any("No applicable reward rule" in w for w in res.warnings)


# ---------------------------------------------------------------------------
# Exclusion
# ---------------------------------------------------------------------------


def test_exclusion_early_exit_is_excluded():
    txn = _make_txn(category="fuel")
    exc_rule = _exclusion_rule("No Fuel", category="fuel")
    res = evaluate(txn, [exc_rule])
    assert res.is_excluded is True
    assert res.effective_reward_inr == Decimal("0")
    assert res.reward_type == RewardType.NONE


def test_exclusion_step_in_breakdown():
    txn = _make_txn(category="fuel")
    exc_rule = _exclusion_rule("No Fuel", category="fuel")
    res = evaluate(txn, [exc_rule])
    steps = [s.step for s in res.breakdown]
    assert "exclusions" in steps


def test_exclusion_takes_precedence_over_bonus():
    txn = _make_txn(merchant="amazon", category="fuel")
    exc_rule = _exclusion_rule("No Fuel", category="fuel")
    bonus_rule = _bonus_rule("Amazon Bonus", merchant="amazon", rate=0.10)
    # Even with a matching bonus rule, exclusion should win.
    res = evaluate(txn, [bonus_rule, exc_rule])
    assert res.is_excluded is True
    assert res.effective_reward_inr == Decimal("0")


def test_non_matching_exclusion_allows_reward():
    txn = _make_txn(merchant="amazon", category="shopping")
    exc_rule = _exclusion_rule("No Fuel", category="fuel")
    bonus_rule = _bonus_rule("Amazon Bonus", merchant="amazon", rate=0.10)
    res = evaluate(txn, [exc_rule, bonus_rule])
    assert res.is_excluded is False
    assert res.effective_reward_inr > Decimal("0")


# ---------------------------------------------------------------------------
# Cashback evaluation
# ---------------------------------------------------------------------------


def test_cashback_percentage():
    # 10% of 1000 = 100
    txn = _make_txn(amount="1000")
    rule = _bonus_rule("10% CB", merchant="amazon", rate=0.10)
    res = evaluate(txn, [rule])
    assert res.reward_type == RewardType.CASHBACK
    assert res.effective_reward_inr == Decimal("100")
    assert res.cashback_amount == Decimal("100")


def test_cashback_zero_rate_gives_zero():
    txn = _make_txn(amount="1000")
    rule = _bonus_rule("Zero Rate", merchant="amazon", rate=0.0)
    res = evaluate(txn, [rule])
    assert res.effective_reward_inr == Decimal("0")


def test_cashback_step_in_breakdown():
    txn = _make_txn()
    rule = _bonus_rule("CB Rule", merchant="amazon", rate=0.05)
    res = evaluate(txn, [rule])
    steps = [s.step for s in res.breakdown]
    assert "cashback" in steps


# ---------------------------------------------------------------------------
# Points evaluation
# ---------------------------------------------------------------------------


def test_points_basic():
    # 1000 / 100 = 10 units * 1 pt/unit = 10 pts * ₹0.25 = ₹2.50
    txn = _make_txn(amount="1000")
    rule = _bonus_rule(
        "Basic Points", merchant="amazon",
        reward_type="points", rate=0,
        extra={"spend_unit": 100, "points_per_unit": 1, "rupee_value": 0.25},
    )
    res = evaluate(txn, [rule])
    assert res.reward_type == RewardType.POINTS
    assert res.reward_points == 10
    assert res.effective_reward_inr == Decimal("2.50")


def test_points_with_multiplier():
    # 500 / 100 = 5 units * 2 pts * 3x = 30 pts * ₹0.25 = ₹7.50
    txn = _make_txn(amount="500")
    rule = _bonus_rule(
        "Multiplier Points", merchant="amazon",
        reward_type="points", rate=0,
        extra={"spend_unit": 100, "points_per_unit": 2, "points_multiplier": 3, "rupee_value": 0.25},
    )
    res = evaluate(txn, [rule])
    assert res.reward_type == RewardType.POINTS
    assert res.reward_points == 30
    assert res.effective_reward_inr == Decimal("7.50")


def test_points_step_in_breakdown():
    txn = _make_txn(amount="500")
    rule = _bonus_rule(
        "Points Rule", merchant="amazon",
        reward_type="points", rate=0,
        extra={"spend_unit": 100, "points_per_unit": 1, "rupee_value": 0.25},
    )
    res = evaluate(txn, [rule])
    steps = [s.step for s in res.breakdown]
    assert "points" in steps


# ---------------------------------------------------------------------------
# Cap interactions
# ---------------------------------------------------------------------------


def test_cap_reduces_cashback():
    # 10% of 1000 = 100, cap = 50 → effective = 50
    txn = _make_txn(amount="1000")
    rule = _bonus_rule(
        "Capped CB", merchant="amazon", rate=0.10,
        extra={"caps": [{"cap_type": "transaction_cap", "limit": 50, "scope": "per_transaction"}]},
    )
    res = evaluate(txn, [rule])
    assert res.effective_reward_inr == Decimal("50")
    assert res.cap_result is not None
    assert res.cap_result.was_capped is True


def test_cap_zero_limit_is_invalid_and_ignored():
    """A cap with limit=0 is invalid (Pydantic gt=0) and is silently skipped.
    The engine treats the config as having no cap, so the full reward passes through.
    """
    txn = _make_txn(amount="1000")
    rule = _bonus_rule(
        "Zero Limit Cap", merchant="amazon", rate=0.10,
        extra={"caps": [{"cap_type": "transaction_cap", "limit": 0, "scope": "per_transaction"}]},
    )
    res = evaluate(txn, [rule])
    # Invalid cap is discarded → full 10% cashback = ₹100
    assert res.effective_reward_inr == Decimal("100")
    assert res.cap_result is None


def test_no_cap_config_passes_through():
    txn = _make_txn(amount="1000")
    rule = _bonus_rule("No Cap", merchant="amazon", rate=0.10)
    res = evaluate(txn, [rule])
    assert res.cap_result is None
    assert res.effective_reward_inr == Decimal("100")


def test_points_fractional_scaling_under_cap():
    # 1000 / 100 * 2 pts * ₹0.25 = 20 pts = ₹5.00. Cap at ₹2.50 → 10 pts.
    txn = _make_txn(amount="1000")
    rule = _bonus_rule(
        "Points + Cap", merchant="amazon",
        reward_type="points", rate=0,
        extra={
            "spend_unit": 100,
            "points_per_unit": 2,
            "rupee_value": 0.25,
            "caps": [{"cap_type": "transaction_cap", "limit": 2.50, "scope": "per_transaction"}],
        },
    )
    res = evaluate(txn, [rule])
    assert res.reward_type == RewardType.POINTS
    assert res.effective_reward_inr == Decimal("2.5")
    assert res.point_value_inr == Decimal("2.5")
    assert res.reward_points == 10


# ---------------------------------------------------------------------------
# Unsupported reward types
# ---------------------------------------------------------------------------


def test_unsupported_reward_type_voucher_returns_zero():
    txn = _make_txn()
    rule = _bonus_rule("Voucher Rule", merchant="amazon", reward_type="voucher", rate=0)
    res = evaluate(txn, [rule])
    assert res.effective_reward_inr == Decimal("0")
    assert any("not yet implemented" in w for w in res.warnings)


def test_unsupported_reward_type_miles_returns_zero():
    txn = _make_txn()
    rule = _bonus_rule("Miles Rule", merchant="amazon", reward_type="miles", rate=0)
    res = evaluate(txn, [rule])
    assert res.effective_reward_inr == Decimal("0")
    assert any("not yet implemented" in w for w in res.warnings)


# ---------------------------------------------------------------------------
# Audit trail integrity
# ---------------------------------------------------------------------------


def test_breakdown_always_has_exclusion_and_matching_steps():
    txn = _make_txn()
    rule = _bonus_rule("CB Rule", merchant="amazon", rate=0.05)
    res = evaluate(txn, [rule])
    step_names = [s.step for s in res.breakdown]
    assert "exclusions" in step_names
    assert "matching" in step_names


def test_breakdown_includes_normalization_step_on_reward():
    txn = _make_txn()
    rule = _bonus_rule("CB Rule", merchant="amazon", rate=0.05)
    res = evaluate(txn, [rule])
    step_names = [s.step for s in res.breakdown]
    assert "normalization" in step_names


def test_breakdown_has_cap_step_when_capped():
    txn = _make_txn(amount="1000")
    rule = _bonus_rule(
        "Capped CB", merchant="amazon", rate=0.10,
        extra={"caps": [{"cap_type": "transaction_cap", "limit": 50, "scope": "per_transaction"}]},
    )
    res = evaluate(txn, [rule])
    step_names = [s.step for s in res.breakdown]
    assert "cap" in step_names


def test_explanations_non_empty_on_reward():
    txn = _make_txn()
    rule = _bonus_rule("CB Rule", merchant="amazon", rate=0.10)
    res = evaluate(txn, [rule])
    assert len(res.explanations) > 0


# ---------------------------------------------------------------------------
# Deterministic invariance tests
# ---------------------------------------------------------------------------


def test_same_input_same_output_repeated():
    """Pure function: identical inputs must always produce identical outputs."""
    txn = _make_txn(merchant="amazon", amount="2000")
    rules = [
        _bonus_rule("10% CB", merchant="amazon", rate=0.10),
        _bonus_rule("Default", rule_type="default_bonus", rate=0.01),
    ]
    results = [evaluate(txn, rules) for _ in range(10)]

    first = results[0]
    for i, res in enumerate(results[1:], start=1):
        assert res.effective_reward_inr == first.effective_reward_inr, \
            f"Call {i} returned {res.effective_reward_inr}, expected {first.effective_reward_inr}"
        assert res.reward_type == first.reward_type
        assert res.reward_type == RewardType.CASHBACK
        assert res.matched_rule is not None
        assert res.matched_rule.rule_name == first.matched_rule.rule_name


def test_same_input_same_breakdown_length():
    """Breakdown trace must be identical in structure across repeated evaluations."""
    txn = _make_txn(amount="500")
    rule = _bonus_rule("CB", merchant="amazon", rate=0.05)
    results = [evaluate(txn, [rule]) for _ in range(5)]
    expected_steps = [s.step for s in results[0].breakdown]
    for res in results[1:]:
        assert [s.step for s in res.breakdown] == expected_steps


def test_shuffle_invariance_cashback():
    """Shuffling rules must not change which rule wins for a clear merchant match."""
    txn = _make_txn(merchant="amazon", category="electronics")
    merchant_rule = _bonus_rule("Merchant 5%", merchant="amazon", rate=0.05, priority=0)
    category_rule = _bonus_rule("Category 8%", rule_type="category_bonus", category="electronics", rate=0.08, priority=0)
    default_rule  = _bonus_rule("Default 1%", rule_type="default_bonus", rate=0.01, priority=0)
    excl_rule     = _exclusion_rule("No Groceries", category="groceries")

    rules = [merchant_rule, category_rule, default_rule, excl_rule]
    rng = random.Random(13)

    for _ in range(25):
        rng.shuffle(rules)
        res = evaluate(txn, list(rules))
        assert res.is_excluded is False
        assert res.matched_rule is not None
        assert res.matched_rule.rule_name == "Merchant 5%", \
            f"Expected 'Merchant 5%' but got '{res.matched_rule.rule_name}' " \
            f"with ordering {[r.rule_name for r in rules]}"
        assert res.effective_reward_inr == Decimal("50")  # 5% of 1000


def test_shuffle_invariance_points_with_cap():
    """Shuffled ordering must not affect final reward amount when cap is active."""
    txn = _make_txn(merchant="amazon", amount="1000")
    capped_points_rule = _bonus_rule(
        "Points 2pts/100", merchant="amazon",
        reward_type="points", rate=0, priority=0,
        extra={
            "spend_unit": 100,
            "points_per_unit": 2,
            "rupee_value": 0.25,
            "caps": [{"cap_type": "transaction_cap", "limit": 2.50, "scope": "per_transaction"}],
        },
    )
    default_rule = _bonus_rule("Default 1%", rule_type="default_bonus", rate=0.01, priority=1)

    rules = [capped_points_rule, default_rule]
    rng = random.Random(77)

    for _ in range(20):
        rng.shuffle(rules)
        res = evaluate(txn, list(rules))
        assert res.effective_reward_inr == Decimal("2.5"), \
            f"Expected ₹2.50 but got ₹{res.effective_reward_inr} " \
            f"with ordering {[r.rule_name for r in rules]}"
        assert res.reward_points == 10


def test_shuffle_invariance_exclusion_always_wins():
    """Exclusion must block reward regardless of rule list ordering."""
    txn = _make_txn(category="fuel")
    excl = _exclusion_rule("No Fuel", category="fuel")
    bonus = _bonus_rule("Fuel Bonus", rule_type="category_bonus", category="fuel", rate=0.05)
    default = _bonus_rule("Default", rule_type="default_bonus", rate=0.01)

    rules = [excl, bonus, default]
    rng = random.Random(55)
    for _ in range(20):
        rng.shuffle(rules)
        res = evaluate(txn, list(rules))
        assert res.is_excluded is True, \
            f"Expected excluded=True with ordering {[r.rule_name for r in rules]}"
        assert res.effective_reward_inr == Decimal("0")
