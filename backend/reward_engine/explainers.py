"""
Module: backend.reward_engine.explainers
Responsibility: Deterministic, human-readable explanation generation for ranked cards.

Architectural Boundaries:
- Pure functions — no I/O, no DB access, no side effects, no randomness.
- Generates text from EvaluationResult fields only — no external state.
- All outputs are deterministic: identical inputs produce identical strings.
- MUST NOT import from DB layer, services, routes, or AI modules.
"""

from __future__ import annotations

from decimal import Decimal

from reward_engine.constants import RewardType, ZERO_DECIMAL
from reward_engine.ranking_schemas import CardEvaluationInput
from reward_engine.ranking_utils import effective_inr, is_cashback


def _fmt_inr(value: Decimal) -> str:
    """Format a Decimal as a human-readable INR string (e.g., '₹100.00')."""
    return f"₹{value:.2f}"


def build_primary_reason(entry: CardEvaluationInput, rank: int) -> str:
    """Return a single-line primary reason string for the ranked recommendation.

    The reason is deterministically derived from the evaluation result.

    Args:
        entry: The card input being explained.
        rank: 1-based position in the final ranking.

    Returns:
        A concise, deterministic reason string.
    """
    ev = entry.evaluation
    reward = effective_inr(ev)

    if ev.is_excluded:
        return "Transaction excluded — no reward earned on this card."

    if reward == ZERO_DECIMAL:
        return "No applicable reward rule matched for this transaction."

    if rank == 1:
        if is_cashback(ev):
            return f"Highest cashback: {_fmt_inr(reward)} earned."
        return f"Best effective reward value: {_fmt_inr(reward)} equivalent."

    if is_cashback(ev):
        return f"Cashback card: {_fmt_inr(reward)} earned."

    return f"Effective reward value: {_fmt_inr(reward)} equivalent."


def build_explanation_lines(entry: CardEvaluationInput) -> list[str]:
    """Build an ordered list of human-readable explanation lines.

    Each line describes one aspect of the evaluation outcome. Lines are
    ordered from most-important to least-important. All output is deterministic.

    Args:
        entry: The card input to explain.

    Returns:
        A non-empty list of explanation strings.
    """
    ev = entry.evaluation
    lines: list[str] = []

    # ---- Exclusion ----
    if ev.is_excluded:
        reason = ev.exclusion_reason or "Transaction type excluded from rewards."
        lines.append(f"Excluded: {reason}")
        return lines

    reward = effective_inr(ev)

    # ---- Match type ----
    if ev.matched_rule is not None:
        match_type = ev.matched_rule.match_type.replace("_", " ").title()
        lines.append(f"Matched via {match_type}: {ev.matched_rule.rule_name}.")

    # ---- Reward type + value ----
    if ev.reward_type == RewardType.CASHBACK and ev.cashback_amount is not None:
        lines.append(f"Cashback earned: {_fmt_inr(ev.cashback_amount)}.")
    elif ev.reward_type == RewardType.POINTS and ev.reward_points is not None:
        pts_inr = _fmt_inr(ev.point_value_inr) if ev.point_value_inr is not None else _fmt_inr(reward)
        lines.append(f"Points earned: {ev.reward_points} pts ({pts_inr} equivalent).")
    elif reward > ZERO_DECIMAL:
        lines.append(f"Effective reward: {_fmt_inr(reward)}.")
    else:
        lines.append("No reward earned for this transaction.")

    # ---- Cap ----
    if ev.cap_result is not None and ev.cap_result.was_capped:
        original = _fmt_inr(ev.cap_result.uncapped_reward)
        capped = _fmt_inr(ev.cap_result.capped_reward)
        lines.append(f"Cap applied: reward reduced from {original} to {capped}.")

    # ---- Merchant-specific bonus ----
    if ev.matched_rule is not None and ev.matched_rule.match_type == "exact_merchant":
        lines.append("Merchant-specific bonus applied.")

    # ---- Forwarded evaluator explanations ----
    for explanation in ev.explanations:
        if explanation not in lines:
            lines.append(explanation)

    return lines or ["No reward details available."]
