"""
Tests: backend/tests/unit/reward_engine/test_ranking.py

Covers:
  - Basic ranking order (highest reward wins)
  - Cashback preferred over equivalent points value
  - Fewer restrictions preferred on equal reward
  - Fewer warnings preferred on equal reward
  - Lower annual fee preferred on equal reward
  - Alphabetical card_name as final deterministic tiebreak
  - Excluded cards ranked last
  - All-excluded scenario (all_excluded flag)
  - Single card input
  - Empty input raises EmptyEvaluationsError
  - Duplicate card_id raises DuplicateCardIdError
  - top_card_id and total_evaluated populated correctly
  - Explanation generation: primary reason, explanation lines
  - Deterministic invariance: same inputs → same output across 10 calls
  - Shuffle invariance: shuffled input order → identical ranking (20 shuffles)
  - Explanations are deterministic and reproducible
"""

from __future__ import annotations

import random
from decimal import Decimal

import pytest

from reward_engine.constants import RewardType
from reward_engine.ranking import rank_cards
from reward_engine.ranking_exceptions import DuplicateCardIdError, EmptyEvaluationsError
from reward_engine.ranking_schemas import CardEvaluationInput, RankingResult
from reward_engine.schemas import CapResult, EvaluationResult, MatchResult
from reward_engine.constants import CapScope, MatchType, ZERO_DECIMAL


# ---------------------------------------------------------------------------
# Fixtures / Factories
# ---------------------------------------------------------------------------


def _cashback_result(
    amount: str,
    *,
    is_excluded: bool = False,
    was_capped: bool = False,
    warnings: list[str] | None = None,
    cap_uncapped: str | None = None,
) -> EvaluationResult:
    """Build an EvaluationResult representing a cashback reward."""
    cashback = Decimal(amount)
    cap_result = None
    if was_capped and cap_uncapped is not None:
        cap_result = CapResult(
            was_capped=True,
            cap_scope=CapScope.PER_TRANSACTION,
            cap_limit=Decimal(cap_uncapped),
            uncapped_reward=Decimal(cap_uncapped),
            capped_reward=cashback,
        )
    return EvaluationResult(
        effective_reward_inr=cashback if not is_excluded else ZERO_DECIMAL,
        reward_type=RewardType.CASHBACK if not is_excluded else RewardType.NONE,
        cashback_amount=cashback if not is_excluded else None,
        is_excluded=is_excluded,
        warnings=warnings or [],
        cap_result=cap_result,
    )


def _points_result(
    points: int,
    rupee_value_per_pt: str = "0.25",
    *,
    warnings: list[str] | None = None,
) -> EvaluationResult:
    """Build an EvaluationResult representing a points reward."""
    rate = Decimal(rupee_value_per_pt)
    value = Decimal(points) * rate
    return EvaluationResult(
        effective_reward_inr=value,
        reward_type=RewardType.POINTS,
        reward_points=points,
        point_value_inr=value,
        warnings=warnings or [],
    )


def _excluded_result(reason: str = "Category excluded") -> EvaluationResult:
    """Build an EvaluationResult for an excluded transaction."""
    return EvaluationResult(
        effective_reward_inr=ZERO_DECIMAL,
        reward_type=RewardType.NONE,
        is_excluded=True,
        exclusion_reason=reason,
    )


def _card(
    name: str,
    evaluation: EvaluationResult,
    *,
    card_id: str | None = None,
    annual_fee: str = "0",
) -> CardEvaluationInput:
    return CardEvaluationInput(
        card_id=card_id or name.lower().replace(" ", "_"),
        card_name=name,
        evaluation=evaluation,
        annual_fee=Decimal(annual_fee),
    )


# ---------------------------------------------------------------------------
# Input validation
# ---------------------------------------------------------------------------


def test_empty_input_raises():
    with pytest.raises(EmptyEvaluationsError):
        rank_cards([])


def test_duplicate_card_id_raises():
    ev = _cashback_result("100")
    cards = [
        _card("Card A", ev, card_id="card_a"),
        _card("Card B", ev, card_id="card_a"),  # same id
    ]
    with pytest.raises(DuplicateCardIdError):
        rank_cards(cards)


# ---------------------------------------------------------------------------
# Single card
# ---------------------------------------------------------------------------


def test_single_card_ranked_first():
    result = rank_cards([_card("HDFC Regalia", _cashback_result("50"))])
    assert result.total_evaluated == 1
    assert result.top_card_id == "hdfc_regalia"
    assert result.ranked[0].rank == 1
    assert result.ranked[0].card_name == "HDFC Regalia"


def test_single_excluded_card_all_excluded():
    result = rank_cards([_card("Fuel Card", _excluded_result())])
    assert result.all_excluded is True
    assert result.ranked[0].is_excluded is True


# ---------------------------------------------------------------------------
# Basic ranking: higher reward wins
# ---------------------------------------------------------------------------


def test_higher_reward_wins():
    cards = [
        _card("Card B", _cashback_result("80")),
        _card("Card A", _cashback_result("100")),
    ]
    result = rank_cards(cards)
    assert result.ranked[0].card_name == "Card A"
    assert result.ranked[1].card_name == "Card B"


def test_all_ranks_assigned():
    cards = [
        _card("Card C", _cashback_result("30")),
        _card("Card A", _cashback_result("100")),
        _card("Card B", _cashback_result("60")),
    ]
    result = rank_cards(cards)
    ranks = [r.rank for r in result.ranked]
    assert ranks == [1, 2, 3]


def test_top_card_id_matches_rank1():
    cards = [
        _card("Low", _cashback_result("10")),
        _card("High", _cashback_result("999")),
    ]
    result = rank_cards(cards)
    assert result.top_card_id == result.ranked[0].card_id


# ---------------------------------------------------------------------------
# Tie-breaking: cashback preferred over points at equal value
# ---------------------------------------------------------------------------


def test_cashback_beats_points_at_equal_value():
    """₹100 cashback beats 400 pts worth ₹100 (₹0.25/pt)."""
    cards = [
        _card("Points Card", _points_result(400, "0.25")),  # 400 * 0.25 = ₹100
        _card("Cashback Card", _cashback_result("100")),
    ]
    result = rank_cards(cards)
    assert result.ranked[0].card_name == "Cashback Card"
    assert result.ranked[1].card_name == "Points Card"


def test_cashback_beats_points_regardless_of_input_order():
    points_card = _card("Points Card", _points_result(400, "0.25"))
    cashback_card = _card("Cashback Card", _cashback_result("100"))

    # Order 1
    r1 = rank_cards([points_card, cashback_card])
    # Order 2
    r2 = rank_cards([cashback_card, points_card])

    assert r1.ranked[0].card_name == "Cashback Card"
    assert r2.ranked[0].card_name == "Cashback Card"


# ---------------------------------------------------------------------------
# Tie-breaking: fewer restrictions preferred
# ---------------------------------------------------------------------------


def test_fewer_restrictions_preferred():
    """At equal reward, uncapped card beats capped card."""
    capped = _card("Capped Card", _cashback_result("100", was_capped=True, cap_uncapped="200"))
    uncapped = _card("Uncapped Card", _cashback_result("100"))
    result = rank_cards([capped, uncapped])
    assert result.ranked[0].card_name == "Uncapped Card"


# ---------------------------------------------------------------------------
# Tie-breaking: fewer warnings preferred
# ---------------------------------------------------------------------------


def test_fewer_warnings_preferred():
    noisy = _card("Noisy Card", _cashback_result("100", warnings=["Warning 1", "Warning 2"]))
    clean = _card("Clean Card", _cashback_result("100"))
    result = rank_cards([noisy, clean])
    assert result.ranked[0].card_name == "Clean Card"


# ---------------------------------------------------------------------------
# Tie-breaking: lower annual fee preferred
# ---------------------------------------------------------------------------


def test_lower_annual_fee_preferred():
    expensive = _card("Premium Card", _cashback_result("100"), annual_fee="5000")
    affordable = _card("Basic Card", _cashback_result("100"), annual_fee="500")
    result = rank_cards([expensive, affordable])
    assert result.ranked[0].card_name == "Basic Card"


# ---------------------------------------------------------------------------
# Tie-breaking: alphabetical card name (final fallback)
# ---------------------------------------------------------------------------


def test_alphabetical_tiebreak_is_final():
    """When everything is equal, alphabetically earlier name wins."""
    card_z = _card("Zeta Card", _cashback_result("100"), card_id="zeta")
    card_a = _card("Alpha Card", _cashback_result("100"), card_id="alpha")
    result = rank_cards([card_z, card_a])
    assert result.ranked[0].card_name == "Alpha Card"


# ---------------------------------------------------------------------------
# Excluded cards
# ---------------------------------------------------------------------------


def test_excluded_cards_ranked_last():
    """Excluded cards (₹0 reward) always rank below cards with rewards."""
    excluded = _card("Excluded Card", _excluded_result())
    rewarded = _card("Rewarded Card", _cashback_result("1"))  # even ₹1 beats excluded
    result = rank_cards([excluded, rewarded])
    assert result.ranked[0].card_name == "Rewarded Card"
    assert result.ranked[-1].card_name == "Excluded Card"


def test_all_excluded_flag_set():
    cards = [
        _card("Card A", _excluded_result("Fuel")),
        _card("Card B", _excluded_result("Wallet top-up")),
    ]
    result = rank_cards(cards)
    assert result.all_excluded is True


def test_partial_exclusion_not_all_excluded():
    cards = [
        _card("Card A", _excluded_result()),
        _card("Card B", _cashback_result("50")),
    ]
    result = rank_cards(cards)
    assert result.all_excluded is False


# ---------------------------------------------------------------------------
# Explanation correctness
# ---------------------------------------------------------------------------


def test_rank1_cashback_primary_reason():
    result = rank_cards([_card("CB Card", _cashback_result("100"))])
    reason = result.ranked[0].recommendation_reason
    assert "Highest cashback" in reason or "₹100" in reason


def test_excluded_card_primary_reason_mentions_exclusion():
    result = rank_cards([_card("Excluded", _excluded_result())])
    reason = result.ranked[0].recommendation_reason
    assert "excluded" in reason.lower() or "Excluded" in reason


def test_explanation_lines_non_empty():
    result = rank_cards([_card("CB Card", _cashback_result("50"))])
    assert len(result.ranked[0].explanations) > 0


def test_cap_mentioned_in_explanations():
    capped = _card("Capped", _cashback_result("50", was_capped=True, cap_uncapped="100"))
    result = rank_cards([capped])
    explanations = " ".join(result.ranked[0].explanations)
    assert "cap" in explanations.lower() or "Cap" in explanations


def test_excluded_explanation_contains_reason():
    result = rank_cards([_card("Excluded", _excluded_result("Fuel transactions excluded"))])
    explanations = " ".join(result.ranked[0].explanations)
    assert "Fuel transactions excluded" in explanations


# ---------------------------------------------------------------------------
# Warnings forwarded
# ---------------------------------------------------------------------------


def test_warnings_forwarded_to_recommendation():
    ev = _cashback_result("100", warnings=["Redemption rate missing"])
    result = rank_cards([_card("Warn Card", ev)])
    assert "Redemption rate missing" in result.ranked[0].warnings


# ---------------------------------------------------------------------------
# Output fields
# ---------------------------------------------------------------------------


def test_cashback_amount_on_recommendation():
    result = rank_cards([_card("CB", _cashback_result("75"))])
    assert result.ranked[0].cashback_amount == Decimal("75")


def test_reward_points_on_recommendation():
    result = rank_cards([_card("Pts", _points_result(200))])
    assert result.ranked[0].reward_points == 200


def test_was_capped_flag_set():
    capped = _card("Capped", _cashback_result("50", was_capped=True, cap_uncapped="100"))
    result = rank_cards([capped])
    assert result.ranked[0].was_capped is True


def test_annual_fee_on_recommendation():
    result = rank_cards([_card("Fee Card", _cashback_result("100"), annual_fee="999")])
    assert result.ranked[0].annual_fee == Decimal("999")


# ---------------------------------------------------------------------------
# Deterministic invariance tests
# ---------------------------------------------------------------------------


def test_same_input_same_output_repeated():
    """Pure function: identical inputs must produce identical outputs across repeated calls."""
    cards = [
        _card("HDFC Regalia", _cashback_result("100")),
        _card("SBI SimplyCLICK", _points_result(400, "0.25")),
        _card("Axis Atlas", _cashback_result("80")),
    ]
    results = [rank_cards(cards) for _ in range(10)]
    expected_order = [r.card_name for r in results[0].ranked]
    for i, res in enumerate(results[1:], 1):
        actual = [r.card_name for r in res.ranked]
        assert actual == expected_order, f"Call {i} produced different order: {actual}"


def test_same_input_same_explanations_repeated():
    """Explanations must be deterministic across repeated calls."""
    cards = [_card("CB Card", _cashback_result("150"))]
    results = [rank_cards(cards) for _ in range(5)]
    expected_reason = results[0].ranked[0].recommendation_reason
    expected_lines = results[0].ranked[0].explanations
    for res in results[1:]:
        assert res.ranked[0].recommendation_reason == expected_reason
        assert res.ranked[0].explanations == expected_lines


def test_shuffle_invariance_basic():
    """Shuffling the input list must not change the final ranking."""
    card_a = _card("Card A", _cashback_result("100"), card_id="a")
    card_b = _card("Card B", _cashback_result("80"),  card_id="b")
    card_c = _card("Card C", _cashback_result("60"),  card_id="c")

    cards = [card_a, card_b, card_c]
    expected = ["Card A", "Card B", "Card C"]

    rng = random.Random(42)
    for _ in range(20):
        rng.shuffle(cards)
        result = rank_cards(list(cards))
        actual = [r.card_name for r in result.ranked]
        assert actual == expected, \
            f"Shuffled order {[c.card_name for c in cards]} produced {actual}"


def test_shuffle_invariance_cashback_vs_points():
    """Cashback always beats equivalent points regardless of input ordering."""
    cb_card = _card("Cashback Card", _cashback_result("100"), card_id="cb")
    pt_card = _card("Points Card",  _points_result(400, "0.25"), card_id="pts")

    cards = [cb_card, pt_card]
    rng = random.Random(7)
    for _ in range(20):
        rng.shuffle(cards)
        result = rank_cards(list(cards))
        assert result.ranked[0].card_name == "Cashback Card", \
            f"Expected Cashback Card first with order {[c.card_name for c in cards]}"


def test_shuffle_invariance_full_tiebreak_cascade():
    """All five tiebreak levels must hold regardless of input order."""
    # All equal reward, equal type. Differs only by name (final tiebreak).
    cards = [
        _card("Zeta Card",  _cashback_result("100"), card_id="zeta"),
        _card("Alpha Card", _cashback_result("100"), card_id="alpha"),
        _card("Beta Card",  _cashback_result("100"), card_id="beta"),
    ]
    expected = ["Alpha Card", "Beta Card", "Zeta Card"]

    rng = random.Random(99)
    for _ in range(20):
        rng.shuffle(cards)
        result = rank_cards(list(cards))
        actual = [r.card_name for r in result.ranked]
        assert actual == expected, \
            f"Shuffled {[c.card_name for c in cards]} → got {actual}"


def test_shuffle_invariance_with_exclusions():
    """Excluded cards must always rank last regardless of input ordering."""
    excluded = _card("Excluded", _excluded_result(), card_id="exc")
    winner   = _card("Winner",   _cashback_result("1"), card_id="win")
    mid      = _card("Mid",      _cashback_result("0.50"), card_id="mid")

    cards = [excluded, winner, mid]
    rng = random.Random(55)
    for _ in range(20):
        rng.shuffle(cards)
        result = rank_cards(list(cards))
        assert result.ranked[0].card_name == "Winner",   \
            f"Expected Winner first: {[r.card_name for r in result.ranked]}"
        assert result.ranked[-1].card_name == "Excluded", \
            f"Expected Excluded last: {[r.card_name for r in result.ranked]}"


def test_shuffle_invariance_annual_fee_tiebreak():
    """Lower annual fee wins the tiebreak over higher fee at equal reward."""
    no_fee  = _card("No Fee Card",  _cashback_result("100"), card_id="no_fee",  annual_fee="0")
    low_fee = _card("Low Fee Card", _cashback_result("100"), card_id="low_fee", annual_fee="500")
    high_fee = _card("High Fee Card",_cashback_result("100"), card_id="high_fee",annual_fee="5000")

    cards = [no_fee, low_fee, high_fee]
    expected = ["No Fee Card", "Low Fee Card", "High Fee Card"]

    rng = random.Random(13)
    for _ in range(20):
        rng.shuffle(cards)
        result = rank_cards(list(cards))
        actual = [r.card_name for r in result.ranked]
        assert actual == expected, \
            f"Shuffled {[c.card_name for c in cards]} → got {actual}"
