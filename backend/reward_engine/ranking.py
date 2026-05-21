"""
Module: backend.reward_engine.ranking
Responsibility: Deterministic ranking orchestrator for multi-card reward comparison.

Architectural Boundaries:
- Pure functions — no I/O, no DB access, no network calls, no randomness.
- Consumes pre-computed EvaluationResult objects from reward_engine.evaluator.
- Does NOT calculate rewards — it only compares and orders evaluator outputs.
- MUST NOT import from DB layer, services, routes, or AI modules.
- Called ONLY by the Service layer (recommendation_service, etc.)

Ranking pipeline:
  1. Validate inputs (no empty list, no duplicate card_ids)
  2. Sort using deterministic 6-level sort key (comparators.ranking_sort_key)
  3. Assign 1-based ranks
  4. Generate explanation per card (explainers.build_*)
  5. Return RankingResult with full ordered list
"""

from __future__ import annotations

from reward_engine.comparators import sort_evaluations
from reward_engine.explainers import build_explanation_lines, build_primary_reason
from reward_engine.ranking_exceptions import DuplicateCardIdError, EmptyEvaluationsError
from reward_engine.ranking_schemas import (
    CardEvaluationInput,
    RankedRecommendation,
    RankingResult,
)
from reward_engine.ranking_utils import count_restrictions, count_warnings, effective_inr


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


def _validate_inputs(entries: list[CardEvaluationInput]) -> None:
    """Raise appropriate exceptions for invalid inputs.

    Args:
        entries: The card evaluations to validate.

    Raises:
        EmptyEvaluationsError: If the list is empty.
        DuplicateCardIdError: If any card_id appears more than once.
    """
    if not entries:
        raise EmptyEvaluationsError()

    seen: set[str] = set()
    for entry in entries:
        if entry.card_id in seen:
            raise DuplicateCardIdError(entry.card_id)
        seen.add(entry.card_id)


# ---------------------------------------------------------------------------
# Recommendation builder
# ---------------------------------------------------------------------------


def _build_recommendation(entry: CardEvaluationInput, rank: int) -> RankedRecommendation:
    """Construct a RankedRecommendation from a sorted CardEvaluationInput.

    Args:
        entry: The evaluated card input at its determined rank position.
        rank: 1-based rank index.

    Returns:
        A fully populated RankedRecommendation.
    """
    ev = entry.evaluation
    return RankedRecommendation(
        rank=rank,
        card_id=entry.card_id,
        card_name=entry.card_name,
        effective_reward_inr=effective_inr(ev),
        cashback_amount=ev.cashback_amount,
        reward_points=ev.reward_points,
        reward_type=ev.reward_type,
        recommendation_reason=build_primary_reason(entry, rank),
        explanations=build_explanation_lines(entry),
        warnings=list(ev.warnings),
        is_excluded=ev.is_excluded,
        was_capped=ev.cap_result is not None and ev.cap_result.was_capped,
        annual_fee=entry.annual_fee,
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def rank_cards(entries: list[CardEvaluationInput]) -> RankingResult:
    """Deterministically rank cards by their pre-computed reward outcomes.

    This is the sole public entry point of the ranking engine. It accepts
    a list of CardEvaluationInput (card identity + EvaluationResult pairs),
    sorts them using a 6-level deterministic comparator, and returns a
    fully ordered RankingResult.

    The ranking is 100% deterministic: the same inputs — regardless of
    list order — always produce the same ranked output.

    Args:
        entries: Pre-computed card evaluations. Must be non-empty and must
                 not contain duplicate card_ids.

    Returns:
        RankingResult with fully ordered ranked recommendations.

    Raises:
        EmptyEvaluationsError: If entries is empty.
        DuplicateCardIdError: If the same card_id appears more than once.
    """
    _validate_inputs(entries)

    sorted_entries = sort_evaluations(entries)

    ranked: list[RankedRecommendation] = [
        _build_recommendation(entry, rank=i + 1)
        for i, entry in enumerate(sorted_entries)
    ]

    all_excluded = all(r.is_excluded for r in ranked)
    top_card_id = ranked[0].card_id if ranked else None

    return RankingResult(
        ranked=ranked,
        total_evaluated=len(ranked),
        top_card_id=top_card_id,
        all_excluded=all_excluded,
    )
