"""
Module: backend.reward_engine.comparators
Responsibility: Deterministic sort key for card ranking.

Architectural Boundaries:
- Pure functions — no I/O, no DB access, no side effects, no randomness.
- Produces a fully deterministic 5-tuple sort key that establishes a
  total order over all CardEvaluationInput entries.
- MUST NOT import from DB layer, services, routes, or AI modules.

Sort Key (ascending — lowest value wins, so negate when "higher is better"):
  1. -effective_reward_inr  → highest reward first
  2. cashback_preference    → 0=cashback, 1=other (cashback preferred on tie)
  3. restriction_count      → fewer restrictions preferred
  4. warning_count          → fewer warnings preferred
  5. (annual_fee, card_name)→ lower fee then alphabetical — stable final fallback
"""

from __future__ import annotations

from decimal import Decimal

from reward_engine.ranking_schemas import CardEvaluationInput
from reward_engine.ranking_utils import (
    cashback_preference_score,
    count_restrictions,
    count_warnings,
    effective_inr,
)


# Type alias for the 6-element sort key tuple.
_SortKey = tuple[Decimal, int, int, int, Decimal, str]


def ranking_sort_key(entry: CardEvaluationInput) -> _SortKey:
    """Produce a deterministic, fully-ordered 6-element sort key.

    Designed for use with Python's ``sorted()`` in ascending order — the
    "best" card will have the smallest key value.

    Tie-breaking cascade:
      1. Highest effective reward (negated so larger → smaller key).
      2. Cashback over other reward types (0 < 1).
      3. Fewer active restrictions (caps, exclusions).
      4. Fewer evaluation warnings.
      5. Lower annual fee.
      6. Alphabetical card_name (stable, deterministic final fallback).

    Args:
        entry: A CardEvaluationInput containing the card identity and its
               pre-computed EvaluationResult.

    Returns:
        A 6-tuple that defines the card's position in the final ranking.
    """
    ev = entry.evaluation
    return (
        -effective_inr(ev),                  # 1. highest reward first (negated)
        cashback_preference_score(ev),        # 2. 0=cashback preferred, 1=other
        count_restrictions(ev),              # 3. fewer restrictions preferred
        count_warnings(ev),                  # 4. fewer warnings preferred
        entry.annual_fee,                    # 5. lower annual fee preferred
        entry.card_name,                     # 6. alphabetical (deterministic)
    )


def sort_evaluations(entries: list[CardEvaluationInput]) -> list[CardEvaluationInput]:
    """Return a new list sorted best-to-worst using the deterministic sort key.

    The original list is never mutated.

    Args:
        entries: Unsorted card evaluation inputs.

    Returns:
        A new list in descending reward order with full deterministic ordering.
    """
    return sorted(entries, key=ranking_sort_key)
