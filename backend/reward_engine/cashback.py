"""
Module: backend.reward_engine.cashback
Responsibility: Deterministic cashback reward evaluation.

Architectural Boundaries:
- Pure functions — no I/O, no DB access, no side effects.
- Evaluates cashback rewards for a matched transaction rule.
- Supports flat cashback, percentage cashback, capped cashback.

Cashback types:
  - percentage: (amount × reward_rate) → capped cashback
  - flat: fixed cashback amount regardless of transaction size
  - merchant-specific: percentage or flat, tied to a specific merchant
  - category-bonus: percentage on a category with optional cap
"""

from __future__ import annotations

from decimal import Decimal

from reward_engine.constants import (
    KEY_CAP,
    KEY_MAX_REWARD,
    KEY_REWARD_RATE,
    ZERO_DECIMAL,
)
from reward_engine.schemas import EvaluationStep, MatchResult, TransactionContext
from reward_engine.utils import calculate_percentage_of, to_decimal, round_inr


def evaluate_cashback(
    txn: TransactionContext,
    match: MatchResult,
) -> Decimal:
    """Evaluate cashback reward for a matched transaction rule.

    Computes the raw cashback amount based on the rule's config. This does NOT
    apply exclusions or caps — those are handled separately in the evaluator pipeline.

    Supported config shapes:
      Percentage cashback:
        {"reward_rate": 0.10}  → 10% of amount

      Flat cashback:
        {"reward_rate": 50}  → flat ₹50 (rate >= 1 is treated as flat INR)

      Capped cashback:
        {"reward_rate": 0.10, "max_reward": 100}  → min(10% of amount, ₹100)

    Args:
        txn: The normalized transaction context.
        match: The matched rule result.

    Returns:
        Raw cashback amount in INR (Decimal, rounded to 2 decimal places).
    """
    config = match.config
    rate_raw = config.get(KEY_REWARD_RATE, 0)
    rate = to_decimal(rate_raw)

    if rate <= ZERO_DECIMAL:
        return ZERO_DECIMAL

    max_reward_raw = config.get(KEY_MAX_REWARD)
    max_reward = to_decimal(max_reward_raw) if max_reward_raw is not None else None

    # Distinguish flat vs percentage: rate >= 1 is treated as flat INR amount
    if rate >= Decimal("1"):
        # Flat cashback
        cashback = rate
    else:
        # Percentage cashback
        cashback = calculate_percentage_of(txn.amount, rate)

    # Apply per-transaction max reward if configured
    if max_reward is not None and max_reward > ZERO_DECIMAL:
        cashback = min(cashback, max_reward)

    return cashback


def build_cashback_step(cashback: Decimal, match: MatchResult) -> EvaluationStep:
    """Build an EvaluationStep documenting the cashback calculation.

    Args:
        cashback: The computed cashback amount.
        match: The matched rule result.

    Returns:
        An EvaluationStep for the audit trail.
    """
    return EvaluationStep(
        step="cashback",
        description=f"Cashback evaluated: ₹{cashback} at rate {match.reward_rate}",
        input_value={
            "amount": str(match.config.get("amount", "N/A")),
            "rate": str(match.reward_rate),
            "rule": match.rule_name,
        },
        output_value=str(cashback),
    )