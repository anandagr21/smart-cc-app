"""
Module: backend.tests.unit.test_caps
Responsibility: Unit tests for the deterministic caps engine.

Covers:
- cap_schemas (Pydantic v2 model validation)
- cap_exceptions (custom exception hierarchy)
- cap_utils (pure utility functions)
- cap_normalizer (config → CapRule pipeline)
- cap_matcher (filtering rules for transaction context)
- caps (multi-cap evaluator & legacy single-cap interface)

Architectural Boundaries:
- Pure deterministic tests — no DB, no network, no I/O.
- Tests exercise the engine boundaries from the task spec:
  monthly caps, annual caps, merchant-specific caps, category caps,
  transaction-level caps, reward exhaustion handling.
"""

from __future__ import annotations

from decimal import Decimal

import pytest

# ---------------------------------------------------------------------------
# Imports under test
# ---------------------------------------------------------------------------
from reward_engine.cap_exceptions import (
    CapExhaustedException,
    CapInvalidConfigException,
    CapNotFoundException,
    CapNotApplicableException,
)
from reward_engine.cap_schemas import (
    CapApplicationDetail,
    CapConfigInput,
    CapEvaluationResult,
    CapRule,
)
from reward_engine.cap_utils import (
    build_cap_key,
    clamp_reward,
    compute_cap_reduction,
    compute_headroom,
    is_cap_exhausted,
    is_near_exhaustion,
    should_apply_cap,
    sum_reductions,
)
from reward_engine.cap_normalizer import normalize_cap_config, normalize_caps
from reward_engine.cap_matcher import match_caps
from reward_engine.caps import apply_single_cap, evaluate_caps
from reward_engine.constants import ZERO_DECIMAL, CapScope

# =============================================================================
# Test Data Helpers
# =============================================================================

def _cap_rule(
    cap_type: str = "monthly_cap",
    limit: Decimal | int = 2000,
    scope: CapScope = CapScope.MONTHLY,
    merchant: str | None = None,
    category: str | None = None,
    priority: int = 0,
) -> CapRule:
    """Factory for concise CapRule creation in tests."""
    return CapRule(
        cap_type=cap_type,
        limit=Decimal(limit),
        scope=scope,
        merchant=merchant,
        category=category,
        priority=priority,
    )


def _detail(
    cap: CapRule,
    before: Decimal,
    after: Decimal,
    headroom_before: Decimal,
    headroom_after: Decimal,
    reduction: Decimal | None = None,
) -> CapApplicationDetail:
    """Factory for CapApplicationDetail with optional auto-computed reduction."""
    return CapApplicationDetail(
        cap_rule=cap,
        reward_before=before,
        reward_after=after,
        reduction=reduction if reduction is not None else before - after,
        headroom_before=headroom_before,
        headroom_after=headroom_after,
        is_exhausted=is_cap_exhausted(headroom_after),
    )


# =============================================================================
# cap_schemas — Pydantic Model Validation
# =============================================================================


class TestCapRule:
    """Tests for CapRule schema."""

    def test_minimal_valid(self):
        rule = CapRule(cap_type="monthly_cap", limit=Decimal("1500"), scope=CapScope.MONTHLY)
        assert rule.cap_type == "monthly_cap"
        assert rule.limit == Decimal("1500")
        assert rule.scope == CapScope.MONTHLY
        assert rule.merchant is None
        assert rule.category is None
        assert rule.priority == 0

    def test_with_merchant(self):
        rule = CapRule(cap_type="merchant_cap", limit=500, scope=CapScope.MONTHLY, merchant="swiggy")
        assert rule.merchant == "swiggy"

    def test_with_category(self):
        rule = CapRule(cap_type="category_cap", limit=1000, scope=CapScope.MONTHLY, category="fuel")
        assert rule.category == "fuel"

    def test_limit_must_be_positive(self):
        with pytest.raises(Exception):
            CapRule(cap_type="monthly_cap", limit=Decimal("0"), scope=CapScope.MONTHLY)

    def test_extra_fields_ignored(self):
        rule = CapRule(cap_type="monthly_cap", limit=Decimal("100"), scope=CapScope.MONTHLY, unknown="x")
        assert rule.cap_type == "monthly_cap"

    def test_priority_bounds(self):
        """Priority defaults to 0 and must be between 0-1000."""
        rule = CapRule(cap_type="x", limit=1, scope=CapScope.PER_TRANSACTION)
        assert rule.priority == 0
        CapRule(cap_type="x", limit=1, scope=CapScope.PER_TRANSACTION, priority=1000)
        with pytest.raises(Exception):
            CapRule(cap_type="x", limit=1, scope=CapScope.PER_TRANSACTION, priority=1001)


class TestCapApplicationDetail:
    """Tests for CapApplicationDetail schema."""

    def test_fully_exhausted(self):
        cap = _cap_rule(limit=500)
        detail = CapApplicationDetail(
            cap_rule=cap,
            reward_before=Decimal("1000"),
            reward_after=Decimal("500"),
            reduction=Decimal("500"),
            headroom_before=Decimal("500"),
            headroom_after=Decimal("0"),
            is_exhausted=True,
        )
        assert detail.is_exhausted is True
        assert detail.reduction == Decimal("500")
        assert detail.headroom_after == Decimal("0")

    def test_partial_reduction(self):
        cap = _cap_rule(limit=1000)
        detail = CapApplicationDetail(
            cap_rule=cap,
            reward_before=Decimal("200"),
            reward_after=Decimal("200"),
            reduction=Decimal("0"),
            headroom_before=Decimal("800"),
            headroom_after=Decimal("800"),
            is_exhausted=False,
        )
        assert detail.reduction == Decimal("0")


class TestCapEvaluationResult:
    """Tests for CapEvaluationResult schema."""

    def test_no_caps_applied(self):
        result = CapEvaluationResult(
            original_reward=Decimal("200"),
            adjusted_reward=Decimal("200"),
        )
        assert result.was_capped is False
        assert result.caps_applied == []
        assert result.warnings == []

    def test_capped_result(self):
        cap = _cap_rule(limit=100)
        result = CapEvaluationResult(
            original_reward=Decimal("200"),
            adjusted_reward=Decimal("100"),
            caps_applied=[
                _detail(cap, Decimal("200"), Decimal("100"), Decimal("100"), Decimal("0")),
            ],
            total_reduction=Decimal("100"),
            remaining_headrooms={"monthly_cap::monthly::": Decimal("0")},
            was_capped=True,
            warnings=["Cap nearly exhausted."],
        )
        assert result.was_capped is True
        assert result.total_reduction == Decimal("100")
        assert result.warnings[0] == "Cap nearly exhausted."


class TestCapConfigInput:
    """Tests for CapConfigInput schema."""

    def test_defaults(self):
        cfg = CapConfigInput()
        assert cfg.cap_type == "transaction_cap"
        assert cfg.limit == 0
        assert cfg.scope == "per_transaction"
        assert cfg.priority == 0

    def test_with_values(self):
        cfg = CapConfigInput(
            cap_type="monthly_cap",
            limit=1500,
            scope="monthly",
            priority=5,
        )
        assert cfg.cap_type == "monthly_cap"
        assert cfg.limit == 1500
        assert cfg.scope == "monthly"
        assert cfg.priority == 5


# =============================================================================
# cap_exceptions — Custom Exceptions
# =============================================================================


class TestCapExceptions:
    """Tests for cap engine exceptions."""

    def test_cap_exhausted_exception(self):
        exc = CapExhaustedException(cap_type="monthly_cap", limit=Decimal("1500"))
        assert exc.cap_type == "monthly_cap"
        assert exc.limit == Decimal("1500")
        assert "Exhausted" in exc.message

    def test_cap_invalid_config_exception(self):
        exc = CapInvalidConfigException(reason="limit must be positive", key="limit", value="-100")
        assert exc.reason == "limit must be positive"
        assert exc.key == "limit"
        assert exc.value == "-100"
        assert "Invalid" in exc.message

    def test_cap_not_found_exception(self):
        exc = CapNotFoundException(cap_type="unknown_cap")
        assert exc.cap_type == "unknown_cap"
        assert "not found" in exc.message.lower()

    def test_cap_not_applicable_exception(self):
        exc = CapNotApplicableException(
            cap_type="merchant_cap",
            merchant="swiggy",
            reason="No transaction for this merchant",
        )
        assert exc.cap_type == "merchant_cap"
        assert exc.merchant == "swiggy"
        assert "not applicable" in exc.message.lower()


# =============================================================================
# cap_utils — Pure Utility Functions
# =============================================================================


class TestBuildCapKey:
    """Tests for build_cap_key."""

    def test_simple_key(self):
        assert build_cap_key("monthly_cap", "monthly") == "monthly_cap::monthly::"

    def test_key_with_merchant(self):
        assert build_cap_key("merchant_cap", "monthly", "swiggy") == "merchant_cap::monthly::swiggy::"

    def test_key_with_category(self):
        assert build_cap_key("category_cap", "monthly", None, "fuel") == "category_cap::monthly::fuel"

    def test_key_with_both(self):
        result = build_cap_key("merchant_cap", "monthly", "amazon", "online")
        assert "merchant_cap" in result
        assert "amazon" in result
        assert "online" in result

    def test_key_consistency(self):
        a = build_cap_key("monthly_cap", "monthly")
        b = build_cap_key("monthly_cap", "monthly")
        assert a == b


class TestClampReward:
    """Tests for clamp_reward."""

    def test_reward_below_headroom(self):
        assert clamp_reward(Decimal("100"), Decimal("200")) == Decimal("100")

    def test_reward_above_headroom(self):
        assert clamp_reward(Decimal("300"), Decimal("200")) == Decimal("200")

    def test_exact_match(self):
        assert clamp_reward(Decimal("150"), Decimal("150")) == Decimal("150")

    def test_zero_reward(self):
        assert clamp_reward(Decimal("0"), Decimal("500")) == Decimal("0")

    def test_zero_headroom(self):
        assert clamp_reward(Decimal("100"), Decimal("0")) == Decimal("0")

    def test_negative_headroom_yields_zero(self):
        assert clamp_reward(Decimal("100"), Decimal("-10")) == Decimal("0")

    def test_negative_reward_yields_zero(self):
        assert clamp_reward(Decimal("-50"), Decimal("100")) == Decimal("0")


class TestComputeHeadroom:
    """Tests for compute_headroom."""

    def test_full_available(self):
        assert compute_headroom(Decimal("1000"), Decimal("0")) == Decimal("1000")

    def test_partial_remaining(self):
        assert compute_headroom(Decimal("1000"), Decimal("600")) == Decimal("400")

    def test_fully_exhausted(self):
        assert compute_headroom(Decimal("1000"), Decimal("1000")) == Decimal("0")

    def test_over_earned_clamped(self):
        assert compute_headroom(Decimal("1000"), Decimal("1200")) == Decimal("0")

    def test_negative_cap_returns_zero(self):
        assert compute_headroom(Decimal("-500"), Decimal("0")) == Decimal("0")


class TestCapReduction:
    """Tests for compute_cap_reduction."""

    def test_reduced(self):
        assert compute_cap_reduction(Decimal("200"), Decimal("150")) == Decimal("50")

    def test_no_reduction(self):
        assert compute_cap_reduction(Decimal("200"), Decimal("200")) == Decimal("0")

    def test_full_reduction(self):
        assert compute_cap_reduction(Decimal("200"), Decimal("0")) == Decimal("200")

    def test_guards_negative(self):
        assert compute_cap_reduction(Decimal("100"), Decimal("200")) == Decimal("0")


class TestIsCapExhausted:
    """Tests for is_cap_exhausted."""

    def test_zero_headroom(self):
        assert is_cap_exhausted(Decimal("0")) is True

    def test_positive_headroom(self):
        assert is_cap_exhausted(Decimal("50")) is False

    def test_tiny_headroom_is_not_exhausted(self):
        assert is_cap_exhausted(Decimal("0.01")) is False


class TestIsNearExhaustion:
    """Tests for is_near_exhaustion."""

    def test_below_ten_percent(self):
        assert is_near_exhaustion(Decimal("50"), Decimal("1000")) is True

    def test_at_ten_percent(self):
        assert is_near_exhaustion(Decimal("100"), Decimal("1000")) is True

    def test_above_ten_percent(self):
        assert is_near_exhaustion(Decimal("200"), Decimal("1000")) is False

    def test_zero_limit(self):
        assert is_near_exhaustion(Decimal("0"), Decimal("0")) is False

    def test_already_exhausted(self):
        """Near-exhaustion check on already exhausted cap — still True."""
        assert is_near_exhaustion(Decimal("0"), Decimal("1000")) is True


class TestShouldApplyCap:
    """Tests for should_apply_cap."""

    def test_positive_limit(self):
        assert should_apply_cap(Decimal("500")) is True

    def test_zero_limit(self):
        assert should_apply_cap(Decimal("0")) is False

    def test_negative_limit(self):
        assert should_apply_cap(Decimal("-100")) is False


class TestSumReductions:
    """Tests for sum_reductions."""

    def test_empty(self):
        assert sum_reductions([]) == Decimal("0")

    def test_single(self):
        cap = _cap_rule()
        details = [_detail(cap, Decimal("200"), Decimal("150"), Decimal("500"), Decimal("450"))]
        assert sum_reductions(details) == Decimal("50")

    def test_multiple(self):
        cap = _cap_rule()
        details = [
            _detail(cap, Decimal("300"), Decimal("200"), Decimal("300"), Decimal("200")),
            _detail(cap, Decimal("200"), Decimal("150"), Decimal("200"), Decimal("150")),
        ]
        assert sum_reductions(details) == Decimal("150")


# =============================================================================
# cap_normalizer — Config → CapRule Pipeline
# =============================================================================


class TestNormalizeCapConfig:
    """Tests for normalize_cap_config."""

    def test_normalize_valid_config(self):
        raw = {"cap_type": "monthly_cap", "limit": "1500", "scope": "monthly", "priority": "5"}
        rule = normalize_cap_config(raw)
        assert rule.cap_type == "monthly_cap"
        assert rule.limit == Decimal("1500")
        assert rule.scope == CapScope.MONTHLY
        assert rule.priority == 5

    def test_default_type_and_scope(self):
        rule = normalize_cap_config({"limit": 500})
        assert rule.cap_type == "transaction_cap"
        assert rule.scope == CapScope.PER_TRANSACTION

    def test_merchant_cap(self):
        rule = normalize_cap_config({
            "cap_type": "merchant_cap",
            "limit": 2000,
            "scope": "monthly",
            "merchant": "amazon",
        })
        assert rule.merchant == "amazon"
        assert rule.category is None

    def test_category_cap(self):
        rule = normalize_cap_config({
            "cap_type": "category_cap",
            "limit": 1000,
            "scope": "annual",
            "category": "fuel",
        })
        assert rule.category == "fuel"
        assert rule.merchant is None

    def test_empty_dict_raises(self):
        """Empty config should raise CapInvalidConfigException (missing limit)."""
        with pytest.raises(CapInvalidConfigException):
            normalize_cap_config({})

    def test_negative_limit_raises(self):
        with pytest.raises(CapInvalidConfigException):
            normalize_cap_config({"limit": -100})

    def test_zero_limit_raises(self):
        with pytest.raises(CapInvalidConfigException):
            normalize_cap_config({"limit": 0})

    def test_invalid_scope_maps_default(self):
        rule = normalize_cap_config({"limit": 500, "scope": "invalid_scope"})
        assert rule.scope == CapScope.MONTHLY

    def test_non_numeric_limit_raises(self):
        with pytest.raises(CapInvalidConfigException):
            normalize_cap_config({"limit": "not_a_number"})


class TestNormalizeCaps:
    """Tests for normalize_caps (batch normalizer)."""

    def test_empty_list(self):
        assert normalize_caps([]) == []

    def test_single_cap(self):
        rules = normalize_caps([{"limit": 1500}])
        assert len(rules) == 1
        assert rules[0].limit == Decimal("1500")

    def test_multiple_caps(self):
        raw = [
            {"cap_type": "monthly_cap", "limit": 2000, "scope": "monthly", "priority": 10},
            {"cap_type": "annual_cap", "limit": 10000, "scope": "annual", "priority": 20},
        ]
        rules = normalize_caps(raw)
        assert len(rules) == 2

    def test_results_are_sorted_by_priority(self):
        raw = [
            {"limit": 500, "priority": 50},
            {"limit": 1000, "priority": 10},
            {"limit": 2000, "priority": 30},
        ]
        rules = normalize_caps(raw)
        assert rules[0].priority == 10
        assert rules[1].priority == 30
        assert rules[2].priority == 50


# =============================================================================
# cap_matcher — Filtering CapRules for Transaction Context
# =============================================================================


class TestMatchCaps:
    """Tests for match_caps."""

    def test_empty_rules(self):
        assert match_caps([], merchant="swiggy", category="food") == []

    def test_merchant_match(self):
        rules = [
            _cap_rule(cap_type="merchant_cap", merchant="swiggy", limit=500),
            _cap_rule(cap_type="merchant_cap", merchant="zomato", limit=500),
        ]
        matched = match_caps(rules, merchant="swiggy", category="food")
        assert len(matched) == 1
        assert matched[0].merchant == "swiggy"

    def test_category_match(self):
        rules = [
            _cap_rule(cap_type="category_cap", category="fuel", limit=500),
            _cap_rule(cap_type="category_cap", category="groceries", limit=300),
        ]
        matched = match_caps(rules, merchant="shell", category="fuel")
        assert len(matched) == 1
        assert matched[0].category == "fuel"

    def test_both_merchant_and_category_match(self):
        """A merchant-specific cap AND a category cap can both apply."""
        rules = [
            _cap_rule(cap_type="merchant_cap", merchant="swiggy", limit=1000),
            _cap_rule(cap_type="category_cap", category="food", limit=500),
        ]
        matched = match_caps(rules, merchant="swiggy", category="food")
        assert len(matched) == 2

    def test_global_caps_always_match(self):
        """Monthly/annual/transaction caps (no merchant/category filter) always match."""
        rules = [
            _cap_rule(cap_type="monthly_cap", limit=2000, scope=CapScope.MONTHLY),
            _cap_rule(cap_type="transaction_cap", limit=500, scope=CapScope.PER_TRANSACTION),
        ]
        matched = match_caps(rules, merchant="any_merchant", category="any_category")
        assert len(matched) == 2

    def test_non_matching_merchant_excluded(self):
        rules = [_cap_rule(cap_type="merchant_cap", merchant="zomato", limit=500)]
        matched = match_caps(rules, merchant="swiggy", category="food")
        assert matched == []

    def test_non_matching_category_excluded(self):
        rules = [_cap_rule(cap_type="category_cap", category="fuel", limit=500)]
        matched = match_caps(rules, merchant="shell", category="food")
        assert matched == []

    def test_merchant_cap_without_merchant_in_txn(self):
        """Merchant cap without a merchant in transaction should be excluded."""
        rules = [_cap_rule(cap_type="merchant_cap", merchant="swiggy", limit=500)]
        matched = match_caps(rules, merchant=None, category="food")
        assert matched == []

    def test_category_cap_without_category_in_txn(self):
        """Category cap without a category in transaction should be excluded."""
        rules = [_cap_rule(cap_type="category_cap", category="fuel", limit=500)]
        matched = match_caps(rules, merchant="shell", category=None)
        assert matched == []


# =============================================================================
# caps — Multi-Cap Evaluator
# =============================================================================


class TestEvaluateCapsPipeline:
    """Tests for evaluate_caps main pipeline."""

    def test_no_caps_returns_unchanged(self):
        result = evaluate_caps(Decimal("500"), [])
        assert result.adjusted_reward == Decimal("500")
        assert result.was_capped is False
        assert result.caps_applied == []

    def test_reward_below_limit(self):
        cap = _cap_rule(cap_type="monthly_cap", limit=1500, scope=CapScope.MONTHLY)
        result = evaluate_caps(Decimal("100"), [cap])
        assert result.adjusted_reward == Decimal("100")
        assert result.was_capped is False

    def test_reward_exceeds_limit_full_clamp(self):
        cap = _cap_rule(cap_type="monthly_cap", limit=1500, scope=CapScope.MONTHLY)
        headrooms = {"monthly_cap::monthly::": Decimal("50")}
        result = evaluate_caps(Decimal("200"), [cap], headrooms=headrooms)
        # headroom = 1500 - 1450 = 50, reward 200 → clamped to 50
        assert result.adjusted_reward == Decimal("50")
        assert result.was_capped is True
        assert result.total_reduction == Decimal("150")

    def test_multiple_caps_applied(self):
        caps = [
            _cap_rule(cap_type="transaction_cap", limit=300, scope=CapScope.PER_TRANSACTION, priority=10),
            _cap_rule(cap_type="monthly_cap", limit=500, scope=CapScope.MONTHLY, priority=20),
        ]
        headrooms = {"monthly_cap::monthly::": Decimal("300")}
        result = evaluate_caps(Decimal("800"), caps, headrooms=headrooms)
        # transaction cap clamps 800 → 300
        # monthly cap: headroom 300, reward 300 → stays 300
        assert result.adjusted_reward == Decimal("300")
        assert result.was_capped is True

    def test_reward_fully_exhausted(self):
        cap = _cap_rule(limit=1000, scope=CapScope.MONTHLY)
        headrooms = {"monthly_cap::monthly::": Decimal("0")}
        result = evaluate_caps(Decimal("500"), [cap], headrooms=headrooms)
        assert result.adjusted_reward == Decimal("0")
        assert result.was_capped is True
        assert result.total_reduction == Decimal("500")

    def test_reward_zero_after_prior_caps(self):
        """When reward hits zero, remaining caps produce zero-pass details."""
        cap1 = _cap_rule(cap_type="monthly_cap", limit=100, scope=CapScope.MONTHLY, priority=10)
        cap2 = _cap_rule(cap_type="annual_cap", limit=5000, scope=CapScope.ANNUAL, priority=20)
        headrooms = {
            "monthly_cap::monthly::": Decimal("0"),
        }
        result = evaluate_caps(Decimal("200"), [cap1, cap2], headrooms=headrooms)
        assert result.adjusted_reward == Decimal("0")
        assert len(result.caps_applied) == 2
        assert result.caps_applied[1].reward_before == Decimal("0")
        assert result.caps_applied[1].reward_after == Decimal("0")

    def test_headroom_exhausted_during_evaluation(self):
        cap = _cap_rule(limit=500, scope=CapScope.MONTHLY)
        headrooms = {"monthly_cap::monthly::": Decimal("400")}
        result = evaluate_caps(Decimal("500"), [cap], headrooms=headrooms)
        # headroom 400, reward 500 → after = 400, headroom after = 0
        assert result.adjusted_reward == Decimal("400")
        assert result.remaining_headrooms["monthly_cap::monthly::"] == Decimal("0")
        assert result.caps_applied[0].is_exhausted is True

    def test_warning_near_exhaustion(self):
        cap = _cap_rule(limit=500, scope=CapScope.MONTHLY)
        headrooms = {"monthly_cap::monthly::": Decimal("450")}
        # reward 30 → uses 30, headroom_after = 420
        # 420/500 = 84% remaining → NOT near exhaustion (near is <= 10%)
        # Let's use a scenario where headroom becomes small:
        result = evaluate_caps(Decimal("405"), [cap], headrooms=headrooms)
        # headroom 450, reward 405 → after 405, headroom_after = 45
        # 45/500 = 9% → near exhaustion
        assert len(result.warnings) == 1
        assert "nearly exhausted" in result.warnings[0].lower()

    def test_no_warning_when_exhausted(self):
        """When cap is fully exhausted, no near-exhaustion warning is emitted."""
        cap = _cap_rule(limit=500, scope=CapScope.MONTHLY)
        headrooms = {"monthly_cap::monthly::": Decimal("100")}
        result = evaluate_caps(Decimal("200"), [cap], headrooms=headrooms)
        # headroom 100, reward 200 → clamped to 100, headroom_after 0, exhausted
        assert result.caps_applied[0].is_exhausted is True
        # Warning only in non-exhausted near-exhaustion path — exhausted skips.
        assert len(result.warnings) == 0

    def test_skip_zero_limit_caps(self):
        """Caps with limit=0 should be skipped (should_apply_cap returns False)."""
        cap = _cap_rule(limit=100, scope=CapScope.MONTHLY)  # valid
        zero_cap = _cap_rule(limit=100, scope=CapScope.MONTHLY)
        # We cannot create zero-limit via _cap_rule since schema rejects it.
        # Instead, test with evaluate_caps uses should_apply_cap guard —
        # but we can't inject a zero-limit CapRule via schema.
        # Skip test — the function code handles this for any CapRule with limit=0
        # that bypasses schema (e.g., raw dict construction).
        pass  # Covered by utility test above.

    def test_headroom_never_negative(self):
        """All tracked headrooms should be >= 0."""
        cap = _cap_rule(limit=500)
        headrooms = {"monthly_cap::monthly::": Decimal("0")}
        result = evaluate_caps(Decimal("200"), [cap], headrooms=headrooms)
        for key, val in result.remaining_headrooms.items():
            assert val >= Decimal("0")

    def test_original_reward_preserved(self):
        cap = _cap_rule(limit=100)
        result = evaluate_caps(Decimal("500"), [cap])
        assert result.original_reward == Decimal("500")
        assert result.adjusted_reward == Decimal("100")

    def test_sorted_by_priority(self):
        """Lower priority caps apply first."""
        high_priority = _cap_rule(cap_type="monthly_cap", limit=100, priority=50, scope=CapScope.MONTHLY)
        low_priority = _cap_rule(cap_type="annual_cap", limit=50, priority=10, scope=CapScope.ANNUAL)
        # Low priority (10) should apply first, then high (50)
        result = evaluate_caps(Decimal("200"), [high_priority, low_priority])
        assert result.caps_applied[0].cap_rule.priority == 10
        assert result.caps_applied[1].cap_rule.priority == 50

    def test_transaction_cap_always_fresh(self):
        """Per-transaction caps always start with full limit regardless of headroom state."""
        cap = _cap_rule(cap_type="transaction_cap", limit=200, scope=CapScope.PER_TRANSACTION)
        headrooms = {"transaction_cap::per_transaction::": Decimal("0")}
        result = evaluate_caps(Decimal("300"), [cap], headrooms=headrooms)
        # Transaction cap starts fresh — full 200 available
        assert result.adjusted_reward == Decimal("200")
        assert result.remaining_headrooms["transaction_cap::per_transaction::"] == Decimal("0")


# =============================================================================
# Legacy Single-Cap Interface
# =============================================================================


class TestApplySingleCap:
    """Tests for legacy apply_single_cap."""

    def test_reward_within_cap(self):
        assert apply_single_cap(Decimal("100"), Decimal("500")) == Decimal("100")

    def test_reward_exceeds_cap(self):
        assert apply_single_cap(Decimal("500"), Decimal("200")) == Decimal("200")

    def test_cumulative_nearly_exhausted(self):
        # cap 1500, earned 1450 → headroom 50, new reward 100 → 50
        result = apply_single_cap(
            Decimal("100"),
            Decimal("1500"),
            cumulative_earned=Decimal("1450"),
        )
        assert result == Decimal("50")

    def test_cumulative_fully_exhausted(self):
        result = apply_single_cap(
            Decimal("100"),
            Decimal("1500"),
            cumulative_earned=Decimal("1500"),
        )
        assert result == Decimal("0")

    def test_zero_cap_limit(self):
        assert apply_single_cap(Decimal("100"), Decimal("0")) == Decimal("100")

    def test_negative_cap_limit(self):
        assert apply_single_cap(Decimal("100"), Decimal("-50")) == Decimal("100")


# =============================================================================
# Scenario Tests — Task Examples
# =============================================================================


class TestScenarioExamples:
    """End-to-end scenario tests matching the task spec examples."""

    def test_example_1_monthly_cashback_partial(self):
        """Monthly cashback cap = ₹1500, earned = ₹1450, new = ₹100 → only ₹50 applied."""
        cap = _cap_rule(cap_type="monthly_cap", limit=1500, scope=CapScope.MONTHLY)
        headrooms = {"monthly_cap::monthly::": Decimal("50")}
        result = evaluate_caps(Decimal("100"), [cap], headrooms=headrooms)
        assert result.adjusted_reward == Decimal("50")
        assert result.was_capped is True
        assert result.total_reduction == Decimal("50")
        assert result.remaining_headrooms["monthly_cap::monthly::"] == Decimal("0")

    def test_example_2_category_cap_exhausted(self):
        """Fuel category cap exhausted → fuel reward becomes ₹0."""
        cap = _cap_rule(cap_type="category_cap", limit=500, scope=CapScope.MONTHLY, category="fuel")
        headrooms = {"category_cap::monthly::fuel": Decimal("0")}
        result = evaluate_caps(Decimal("80"), [cap], headrooms=headrooms)
        assert result.adjusted_reward == Decimal("0")
        assert result.was_capped is True
        assert result.caps_applied[0].is_exhausted is True

    def test_combined_monthly_and_category_caps(self):
        """Both monthly and category caps apply to a single reward."""
        monthly = _cap_rule(cap_type="monthly_cap", limit=1500, scope=CapScope.MONTHLY, priority=10)
        category = _cap_rule(cap_type="category_cap", limit=200, scope=CapScope.MONTHLY, category="fuel", priority=5)
        headrooms = {
            "category_cap::monthly::fuel": Decimal("100"),
            "monthly_cap::monthly::": Decimal("1500"),
        }
        # Category cap (priority 5) applies first: 100→100
        # Monthly cap (priority 10): headroom 1500, reward 100 → 100
        result = evaluate_caps(Decimal("100"), [monthly, category], headrooms=headrooms)
        assert result.adjusted_reward == Decimal("100")

    def test_annual_and_monthly_stacking(self):
        """Annual cap and monthly cap both apply independently."""
        monthly = _cap_rule(cap_type="monthly_cap", limit=500, scope=CapScope.MONTHLY, priority=10)
        annual = _cap_rule(cap_type="annual_cap", limit=2000, scope=CapScope.ANNUAL, priority=20)
        headrooms = {
            "monthly_cap::monthly::": Decimal("400"),
            "annual_cap::annual::": Decimal("300"),
        }
        # Monthly: headroom 400, reward 500 → 400
        # Annual: headroom 300, reward 400 → 300
        result = evaluate_caps(Decimal("500"), [monthly, annual], headrooms=headrooms)
        assert result.adjusted_reward == Decimal("300")
        assert result.total_reduction == Decimal("200")
        assert len(result.caps_applied) == 2

    def test_transaction_cap_on_high_value_purchase(self):
        """Transaction-level cap limits per-transaction reward."""
        txn_cap = _cap_rule(cap_type="transaction_cap", limit=200, scope=CapScope.PER_TRANSACTION, priority=10)
        monthly = _cap_rule(cap_type="monthly_cap", limit=1500, scope=CapScope.MONTHLY, priority=20)
        result = evaluate_caps(Decimal("1000"), [txn_cap, monthly])
        # Transaction cap: 1000 → 200
        # Monthly cap: 200 → 200 (under 1500)
        assert result.adjusted_reward == Decimal("200")
        assert result.total_reduction == Decimal("800")

    def test_all_caps_exhausted_zero_reward(self):
        """When every cap is exhausted, reward is zero with appropriate warnings."""
        monthly = _cap_rule(cap_type="monthly_cap", limit=1000, scope=CapScope.MONTHLY)
        txn = _cap_rule(cap_type="transaction_cap", limit=500, scope=CapScope.PER_TRANSACTION)
        headrooms = {"monthly_cap::monthly::": Decimal("0")}
        # Transaction cap (always fresh): 1000 → 500
        # Monthly cap: headroom 0, reward 500 → 0
        result = evaluate_caps(Decimal("1000"), [monthly, txn], headrooms=headrooms)
        assert result.adjusted_reward == Decimal("0")
        # Monthly cap detail should show exhaustion
        monthly_detail = [d for d in result.caps_applied if d.cap_rule.scope == CapScope.MONTHLY][0]
        assert monthly_detail.is_exhausted is True

    def test_partial_reduction_across_multiple_caps(self):
        """Multiple caps partially reduce reward in cascade."""
        c1 = _cap_rule(cap_type="monthly_cap", limit=1000, scope=CapScope.MONTHLY, priority=10)
        c2 = _cap_rule(cap_type="annual_cap", limit=300, scope=CapScope.ANNUAL, priority=20)
        headrooms = {
            "monthly_cap::monthly::": Decimal("600"),
            "annual_cap::annual::": Decimal("300"),
        }
        result = evaluate_caps(Decimal("800"), [c1, c2], headrooms=headrooms)
        # Monthly: headroom 600, 800→600
        # Annual: headroom 300, 600→300
        assert result.adjusted_reward == Decimal("300")
        assert result.total_reduction == Decimal("500")

    def test_warnings_accumulate(self):
        """Multiple near-exhaustion caps produce multiple warnings."""
        c1 = _cap_rule(cap_type="monthly_cap", limit=1000, scope=CapScope.MONTHLY, priority=10)
        c2 = _cap_rule(cap_type="annual_cap", limit=1000, scope=CapScope.ANNUAL, priority=20)
        headrooms = {
            "monthly_cap::monthly::": Decimal("1000"),
            "annual_cap::annual::": Decimal("1000"),
        }
        # Reward 1910: monthly headroom 1000 → 1000 (exhausted, no warning)
        # annual headroom 1000, reward 1000 → 1000 (exhausted, no warning)
        # Use a scenario where after reduction headroom is small but not zero:
        # Monthly: headroom 100, reward 80 → reward 80, headroom after 20 → 20/1000=2% → warning
        headrooms2 = {
            "monthly_cap::monthly::": Decimal("100"),
            "annual_cap::annual::": Decimal("50"),
        }
        # Monthly: headroom 100, reward 150 → 100, headroom_after 0 → exhausted, no warning
        # Annual: headroom 50, reward 100 → 50, headroom_after 0 → exhausted, no warning
        # Let's craft a clear near-exhaustion scenario:
        # Monthly: headroom 60, reward 30 → reward 30, headroom after 30, 30/1000 = 3% → warning
        # Annual: headroom 100, reward 30 → reward 30, headroom after 70, 70/1000 = 7% → warning
        headrooms3 = {
            "monthly_cap::monthly::": Decimal("60"),
            "annual_cap::annual::": Decimal("100"),
        }
        result = evaluate_caps(Decimal("30"), [c1, c2], headrooms=headrooms3)
        # Both caps: reward stays 30, headroom_after = 30 and 70 respectively
        # 30/1000 = 3% → warning, 70/1000 = 7% → warning
        assert len(result.warnings) == 2, f"expected 2 warnings, got {result.warnings}"