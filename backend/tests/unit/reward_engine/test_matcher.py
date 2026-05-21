"""
Tests: backend/tests/unit/reward_engine/test_matcher.py

Covers:
  - Empty rule list
  - Exact merchant match
  - Category match
  - Payment mode match
  - Default / fallback match
  - Predicate gates: min_spend, validity window, payment mode
  - Rule precedence (merchant > category > payment_mode > default)
  - Deterministic tie-breaking (priority, specificity, reward_rate, rule_name)
  - Deterministic invariance: same input → same output regardless of call count
  - Shuffle invariance: shuffled rule order → same winner
"""

from decimal import Decimal
import random

import pytest

from reward_engine.constants import MatchType, RewardType
from reward_engine.matcher import match_rules
from reward_engine.schemas import NormalizedRuleConfig, TransactionContext


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_txn(
    merchant: str = "amazon",
    category: str = "shopping",
    amount: str = "500",
    payment_mode: str = "any",
    transaction_date: str | None = None,
) -> TransactionContext:
    return TransactionContext(
        merchant=merchant,
        category=category,
        amount=Decimal(amount),
        payment_mode=payment_mode,
        transaction_date=transaction_date,
    )


def _cashback_rule(
    name: str,
    *,
    rule_type: str = "merchant_bonus",
    priority: int = 0,
    rate: float = 0.05,
    merchant: str | None = None,
    category: str | None = None,
    payment_mode: str | None = None,
    min_spend: float | None = None,
    valid_from: str | None = None,
    valid_to: str | None = None,
) -> NormalizedRuleConfig:
    cfg: dict = {"reward_rate": rate, "reward_type": "cashback"}
    if merchant is not None:
        cfg["merchant"] = merchant
    if category is not None:
        cfg["category"] = category
    if payment_mode is not None:
        cfg["payment_mode"] = payment_mode
    if min_spend is not None:
        cfg["min_spend"] = min_spend
    if valid_from is not None:
        cfg["valid_from"] = valid_from
    if valid_to is not None:
        cfg["valid_to"] = valid_to
    return NormalizedRuleConfig(rule_name=name, rule_type=rule_type, priority=priority, config=cfg)


# ---------------------------------------------------------------------------
# Basic correctness
# ---------------------------------------------------------------------------


def test_empty_rules_returns_none():
    txn = _make_txn()
    assert match_rules(txn, []) is None


def test_single_merchant_match():
    txn = _make_txn(merchant="amazon")
    rule = _cashback_rule("Amazon Bonus", merchant="amazon")
    match = match_rules(txn, [rule])
    assert match is not None
    assert match.rule_name == "Amazon Bonus"
    assert match.match_type == MatchType.EXACT_MERCHANT


def test_no_match_wrong_merchant():
    txn = _make_txn(merchant="flipkart")
    rule = _cashback_rule("Amazon Bonus", merchant="amazon")
    assert match_rules(txn, [rule]) is None


def test_category_match():
    txn = _make_txn(merchant="zomato", category="dining")
    rule = _cashback_rule("Dining Bonus", rule_type="category_bonus", category="dining")
    match = match_rules(txn, [rule])
    assert match is not None
    assert match.match_type == MatchType.CATEGORY_MATCH


def test_default_match():
    txn = _make_txn(merchant="unknown_store", category="miscellaneous")
    rule = _cashback_rule("Default 1%", rule_type="default_bonus", rate=0.01)
    match = match_rules(txn, [rule])
    assert match is not None
    assert match.match_type == MatchType.DEFAULT


def test_payment_mode_match():
    txn = _make_txn(payment_mode="online")
    rule = _cashback_rule("Online Bonus", rule_type="payment_mode_bonus", payment_mode="online", rate=0.02)
    match = match_rules(txn, [rule])
    assert match is not None
    assert match.match_type == MatchType.PAYMENT_MODE


# ---------------------------------------------------------------------------
# Predicate gate correctness
# ---------------------------------------------------------------------------


def test_min_spend_gate_rejects():
    txn = _make_txn(amount="50")
    rule = _cashback_rule("High Spend", merchant="amazon", min_spend=100)
    assert match_rules(txn, [rule]) is None


def test_min_spend_gate_allows():
    txn = _make_txn(amount="100")
    rule = _cashback_rule("High Spend", merchant="amazon", min_spend=100)
    assert match_rules(txn, [rule]) is not None


def test_validity_window_rejects_before():
    txn = _make_txn(transaction_date="2024-05-01")
    rule = _cashback_rule("Summer Promo", merchant="amazon", valid_from="2024-06-01", valid_to="2024-06-30")
    assert match_rules(txn, [rule]) is None


def test_validity_window_rejects_after():
    txn = _make_txn(transaction_date="2024-07-15")
    rule = _cashback_rule("Summer Promo", merchant="amazon", valid_from="2024-06-01", valid_to="2024-06-30")
    assert match_rules(txn, [rule]) is None


def test_validity_window_allows_within():
    txn = _make_txn(transaction_date="2024-06-15")
    rule = _cashback_rule("Summer Promo", merchant="amazon", valid_from="2024-06-01", valid_to="2024-06-30")
    assert match_rules(txn, [rule]) is not None


def test_validity_no_window_always_matches():
    txn = _make_txn(transaction_date="2024-01-01")
    rule = _cashback_rule("Always On", merchant="amazon")
    assert match_rules(txn, [rule]) is not None


def test_payment_mode_gate_rejects_mismatch():
    txn = _make_txn(payment_mode="online")
    rule = _cashback_rule("Offline Only", merchant="amazon", payment_mode="offline")
    assert match_rules(txn, [rule]) is None


def test_payment_mode_any_allows_all():
    for mode in ("online", "offline", "contactless", "upi"):
        txn = _make_txn(payment_mode=mode)
        rule = _cashback_rule("Any Mode", merchant="amazon")  # no payment_mode → "any"
        assert match_rules(txn, [rule]) is not None, f"Expected match for mode={mode}"


# ---------------------------------------------------------------------------
# Specificity precedence (merchant > category > payment_mode > default)
# ---------------------------------------------------------------------------


def test_merchant_beats_category():
    txn = _make_txn(merchant="amazon", category="shopping")
    merchant_rule = _cashback_rule("Merchant Rule", merchant="amazon", rate=0.01, priority=0)
    category_rule = _cashback_rule("Category Rule", rule_type="category_bonus", category="shopping", rate=0.10, priority=0)
    match = match_rules(txn, [category_rule, merchant_rule])
    assert match is not None
    assert match.rule_name == "Merchant Rule"
    assert match.match_type == MatchType.EXACT_MERCHANT


def test_category_beats_default():
    txn = _make_txn(merchant="unknown", category="dining")
    category_rule = _cashback_rule("Category Rule", rule_type="category_bonus", category="dining", priority=0)
    default_rule = _cashback_rule("Default Rule", rule_type="default_bonus", priority=0)
    match = match_rules(txn, [default_rule, category_rule])
    assert match is not None
    assert match.rule_name == "Category Rule"


def test_lower_priority_number_wins():
    """Lower numeric priority value wins (higher precedence)."""
    txn = _make_txn(merchant="amazon", category="shopping")
    high_prio = _cashback_rule("High Priority", merchant="amazon", rate=0.05, priority=1)
    low_prio = _cashback_rule("Low Priority", merchant="amazon", rate=0.05, priority=5)
    match = match_rules(txn, [low_prio, high_prio])
    assert match is not None
    assert match.rule_name == "High Priority"


# ---------------------------------------------------------------------------
# Deterministic tie-breaking
# ---------------------------------------------------------------------------


def test_tie_broken_by_higher_rate():
    """When priority and specificity match, higher reward_rate wins."""
    txn = _make_txn(category="dining")
    low_rate = _cashback_rule("Low Rate", rule_type="category_bonus", category="dining", rate=0.02, priority=0)
    high_rate = _cashback_rule("High Rate", rule_type="category_bonus", category="dining", rate=0.05, priority=0)
    match = match_rules(txn, [low_rate, high_rate])
    assert match is not None
    assert match.rule_name == "High Rate"


def test_tie_broken_by_rule_name_alphabetical():
    """When priority, specificity, and rate all match, alphabetically earlier rule_name wins."""
    txn = _make_txn(category="dining")
    rule_z = _cashback_rule("Zeta Rule", rule_type="category_bonus", category="dining", rate=0.05, priority=0)
    rule_a = _cashback_rule("Alpha Rule", rule_type="category_bonus", category="dining", rate=0.05, priority=0)
    match = match_rules(txn, [rule_z, rule_a])
    assert match is not None
    assert match.rule_name == "Alpha Rule"


def test_full_tiebreak_cascade():
    """Test all four tie-break levels."""
    txn = _make_txn(category="dining")
    # Same priority=0, same specificity=CATEGORY, same rate=0.05, name="B Rule" vs "A Rule"
    rule_b = _cashback_rule("B Rule", rule_type="category_bonus", category="dining", rate=0.05, priority=0)
    rule_a = _cashback_rule("A Rule", rule_type="category_bonus", category="dining", rate=0.05, priority=0)
    # Lower rate rule with earlier name — rate should win over name
    rule_a_low_rate = _cashback_rule("A Rule Low Rate", rule_type="category_bonus", category="dining", rate=0.01, priority=0)

    match = match_rules(txn, [rule_a_low_rate, rule_b, rule_a])
    assert match is not None
    assert match.rule_name == "A Rule"  # Beats B Rule (name), beats A Rule Low Rate (rate)


# ---------------------------------------------------------------------------
# Deterministic invariance tests
# ---------------------------------------------------------------------------


def test_repeated_calls_produce_identical_results():
    """Same inputs must always produce the same output (function purity)."""
    txn = _make_txn(merchant="amazon", category="shopping")
    rules = [
        _cashback_rule("Rule A", merchant="amazon", rate=0.05, priority=0),
        _cashback_rule("Rule B", rule_type="category_bonus", category="shopping", rate=0.10, priority=0),
    ]
    results = [match_rules(txn, rules) for _ in range(10)]
    assert all(r is not None for r in results)
    assert all(r.rule_name == results[0].rule_name for r in results), \
        "match_rules returned different rule names across repeated calls"
    assert all(r.match_type == results[0].match_type for r in results)


def test_shuffle_invariance_merchant_wins():
    """Rule ordering must not affect which rule wins (deterministic sort)."""
    txn = _make_txn(merchant="amazon", category="shopping")
    merchant_rule = _cashback_rule("Merchant Bonus", merchant="amazon", rate=0.05, priority=0)
    category_rule = _cashback_rule("Category Bonus", rule_type="category_bonus", category="shopping", rate=0.10, priority=0)
    default_rule = _cashback_rule("Default Bonus", rule_type="default_bonus", rate=0.01, priority=0)

    rules = [merchant_rule, category_rule, default_rule]
    expected_winner = "Merchant Bonus"

    rng = random.Random(42)
    for _ in range(20):
        rng.shuffle(rules)
        match = match_rules(txn, list(rules))
        assert match is not None
        assert match.rule_name == expected_winner, \
            f"Expected '{expected_winner}' but got '{match.rule_name}' with ordering {[r.rule_name for r in rules]}"


def test_shuffle_invariance_tie_by_rate():
    """When multiple category rules compete, highest rate always wins regardless of list order."""
    txn = _make_txn(category="fuel")
    low  = _cashback_rule("Low",  rule_type="category_bonus", category="fuel", rate=0.01, priority=0)
    mid  = _cashback_rule("Mid",  rule_type="category_bonus", category="fuel", rate=0.03, priority=0)
    high = _cashback_rule("High", rule_type="category_bonus", category="fuel", rate=0.05, priority=0)

    rules = [low, mid, high]
    rng = random.Random(99)
    for _ in range(20):
        rng.shuffle(rules)
        match = match_rules(txn, list(rules))
        assert match is not None
        assert match.rule_name == "High", \
            f"Expected 'High' but got '{match.rule_name}' with ordering {[r.rule_name for r in rules]}"


def test_shuffle_invariance_alphabetical_tiebreak():
    """When rate also ties, alphabetically earliest rule_name always wins."""
    txn = _make_txn(category="travel")
    rule_gamma = _cashback_rule("Gamma", rule_type="category_bonus", category="travel", rate=0.05, priority=0)
    rule_alpha = _cashback_rule("Alpha", rule_type="category_bonus", category="travel", rate=0.05, priority=0)
    rule_beta  = _cashback_rule("Beta",  rule_type="category_bonus", category="travel", rate=0.05, priority=0)

    rules = [rule_gamma, rule_alpha, rule_beta]
    rng = random.Random(7)
    for _ in range(20):
        rng.shuffle(rules)
        match = match_rules(txn, list(rules))
        assert match is not None
        assert match.rule_name == "Alpha", \
            f"Expected 'Alpha' but got '{match.rule_name}' with ordering {[r.rule_name for r in rules]}"
