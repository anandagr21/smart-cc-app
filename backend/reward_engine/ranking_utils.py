"""
Module: backend.reward_engine.ranking_utils
Responsibility: Pure utility helpers for the deterministic ranking engine.

Architectural Boundaries:
- Pure functions — no I/O, no DB access, no side effects.
- Helpers that extract scalar signals from EvaluationResult for
  use by comparators and explainers.
- MUST NOT import from DB layer, services, routes, or AI modules.
"""

from __future__ import annotations

from decimal import Decimal

from reward_engine.constants import RewardType, ZERO_DECIMAL
from reward_engine.schemas import EvaluationResult


def is_cashback(evaluation: EvaluationResult) -> bool:
    """Return True if the evaluation produced a cashback reward."""
    return evaluation.reward_type == RewardType.CASHBACK


def count_warnings(evaluation: EvaluationResult) -> int:
    """Return the number of non-fatal warnings on an evaluation.

    Fewer warnings signals a cleaner, less restricted card for this transaction.
    """
    return len(evaluation.warnings)


def count_restrictions(evaluation: EvaluationResult) -> int:
    """Count how many restrictions were active (caps applied + is_excluded flag).

    Lower restriction count is preferred when effective values are equal.
    A cap being applied counts as one restriction; exclusion counts as one.
    """
    restrictions = 0
    if evaluation.is_excluded:
        restrictions += 1
    if evaluation.cap_result is not None and evaluation.cap_result.was_capped:
        restrictions += 1
    return restrictions


def effective_inr(evaluation: EvaluationResult) -> Decimal:
    """Extract the effective reward in INR, clamped to zero from below."""
    return max(ZERO_DECIMAL, evaluation.effective_reward_inr)


def cashback_preference_score(evaluation: EvaluationResult) -> int:
    """Return 0 for cashback (preferred), 1 for everything else.

    Used as the second sort key so cashback cards win ties over points cards.
    """
    return 0 if is_cashback(evaluation) else 1
