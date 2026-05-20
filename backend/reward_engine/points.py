"""
Module: backend.reward_engine.points
Responsibility: Deterministic reward points evaluation.

Architectural Boundaries:
- Pure functions — no I/O, no DB access, no side effects.
- Evaluates reward points for a matched transaction rule.
- Supports base points, point multipliers, and point-to-INR conversion.

Points calculation:
  points = floor(amount / spend_unit) × points_per_unit × multiplier
  INR value = points × rupee_value_per_point
"""

from __future__ import annotations

from decimal import Decimal

from reward_engine.constants import (
    DEFAULT_RUPEE_VALUE_PER_POINT,
    KEY_POINTS_MULTIPLIER,
    KEY_POINTS_PER_UNIT,
    KEY_RUPEE_VALUE,
    KEY_SPEND_UNIT,
    ZERO_DECIMAL,
)
from reward_engine.schemas import EvaluationStep, MatchResult, PointsResult, TransactionContext
from reward_engine.utils import compute_points, to_decimal


def evaluate_points(
    txn: TransactionContext,
    match: MatchResult,
) -> PointsResult:
    """Evaluate reward points for a matched transaction rule.

    Extracts points configuration from the rule's config dict and computes
    the earned points and their INR equivalent.

    Config keys read:
      spend_unit: INR required to earn base points (default: 100)
      points_per_unit: Base points earned per spend_unit (default: 1)
      points_multiplier: Multiplier applied (default: 1)
      rupee_value: Value of 1 point in INR (default: 0.25)

    Args:
        txn: The normalized transaction context.
        match: The matched rule result.

    Returns:
        PointsResult with earned_points, rupee_value_per_point, and rupee_value.

    Example:
        ₹1000 spend, 100/spend_unit, 2 pts/unit, 5x multiplier, ₹0.25/pt
        → points = floor(1000/100) × 2 × 5 = 100
        → INR value = 100 × 0.25 = ₹25.00
    """
    config = match.config

    spend_unit_raw = config.get(KEY_SPEND_UNIT, 100)
    spend_unit = to_decimal(spend_unit_raw)

    points_per_unit_raw = config.get(KEY_POINTS_PER_UNIT, 1)
    points_per_unit = to_decimal(points_per_unit_raw)

    multiplier_raw = config.get(KEY_POINTS_MULTIPLIER, 1)
    multiplier = to_decimal(multiplier_raw)

    rupee_value_raw = config.get(KEY_RUPEE_VALUE)
    if rupee_value_raw is not None:
        rupee_value_per_point = to_decimal(rupee_value_raw)
    else:
        rupee_value_per_point = DEFAULT_RUPEE_VALUE_PER_POINT

    points = compute_points(txn.amount, spend_unit, points_per_unit, multiplier)
    total_rupee_value = to_decimal(points) * rupee_value_per_point

    return PointsResult(
        earned_points=points,
        rupee_value_per_point=rupee_value_per_point,
        rupee_value=total_rupee_value,
    )


def build_points_step(points_result: PointsResult, match: MatchResult) -> EvaluationStep:
    """Build an EvaluationStep documenting the points calculation.

    Args:
        points_result: The result from evaluate_points.
        match: The matched rule result.

    Returns:
        An EvaluationStep for the audit trail.
    """
    return EvaluationStep(
        step="points",
        description=(
            f"Points evaluated: {points_result.earned_points} pts "
            f"(₹{points_result.rupee_value})"
        ),
        input_value={
            "rule": match.rule_name,
            "spend_unit": str(match.config.get(KEY_SPEND_UNIT, 100)),
            "points_per_unit": str(match.config.get(KEY_POINTS_PER_UNIT, 1)),
            "multiplier": str(match.config.get(KEY_POINTS_MULTIPLIER, 1)),
        },
        output_value={
            "earned_points": points_result.earned_points,
            "rupee_value": str(points_result.rupee_value),
            "rupee_value_per_point": str(points_result.rupee_value_per_point),
        },
    )