"""
Module: backend.reward_engine.evaluator
Responsibility: Central deterministic reward evaluation pipeline.

Architectural Boundaries:
- Pure orchestrator — composes pure sub-modules in a fixed pipeline.
- No DB access, no network, no AI, no FastAPI dependencies.
- Stateless: receives full (transaction, rules) context, returns a result.
- Only module that other layers (services, routes) should import from this package.

Pipeline (fixed order):
  1. Exclusion check  →  early exit if excluded
  2. Rule matching    →  find best rule for transaction
  3. Cashback / Points evaluation (by reward_type)
  4. Cap application  →  enforce limits
  5. Normalization    →  unify into effective INR
  6. Structured result with audit trail
"""

from __future__ import annotations

from decimal import Decimal
from typing import Optional

from reward_engine.caps import apply_caps_from_config
from reward_engine.cashback import build_cashback_step, evaluate_cashback
from reward_engine.constants import RewardType, ZERO_DECIMAL
from reward_engine.exclusions import evaluate_exclusions
from reward_engine.matcher import filter_bonus_rules, filter_exclusion_rules, match_rules
from reward_engine.normalizer import compute_effective_reward, normalize_reward_type
from reward_engine.points import build_points_step, evaluate_points
from reward_engine.schemas import (
    CapResult,
    EvaluationResult,
    EvaluationStep,
    MatchResult,
    NormalizedRuleConfig,
    PointsResult,
    TransactionContext,
)
from reward_engine.utils import to_decimal


def evaluate(
    txn: TransactionContext,
    rules: list[NormalizedRuleConfig],
) -> EvaluationResult:
    """Evaluate rewards for a single transaction against a card's rules.

    This is the primary entry point for the deterministic reward engine.
    It runs the full pipeline and returns a self-documenting result with
    an audit trail.

    Edge cases handled:
      - Empty rules list → zero result
      - No matching rule → zero result
      - Excluded transaction → zero result with exclusion info
      - Cap reduces reward to 0 → valid zero-cap result
      - Future reward types → warning, zero result

    Args:
        txn: The normalized transaction context.
        rules: All normalized reward rules for the card being evaluated.

    Returns:
        EvaluationResult with effective_reward_inr, breakdown, and diagnostics.

    Raises:
        Never — all errors are captured in warnings/breakdown.
    """
    breakdown: list[EvaluationStep] = []
    warnings: list[str] = []

    # ------------------------------------------------------------------
    # Step 1: Exclusion check (early exit)
    # ------------------------------------------------------------------
    exclusion_rules = filter_exclusion_rules(rules)
    exclusion_result = evaluate_exclusions(txn, exclusion_rules)

    breakdown.append(
        EvaluationStep(
            step="exclusions",
            description=(
                f"Exclusion check: excluded={exclusion_result.is_excluded}"
                + (f" ({exclusion_result.reason})" if exclusion_result.is_excluded else "")
            ),
            input_value={"exclusion_rules_count": len(exclusion_rules)},
            output_value=exclusion_result.model_dump(),
        )
    )

    if exclusion_result.is_excluded:
        return EvaluationResult.zero(
            exclusion_reason=exclusion_result.reason or "Excluded by rule",
            warnings=warnings,
            breakdown=breakdown,
        )

    # ------------------------------------------------------------------
    # Step 2: Rule matching
    # ------------------------------------------------------------------
    bonus_rules = filter_bonus_rules(rules)
    match = match_rules(txn, bonus_rules)

    breakdown.append(
        EvaluationStep(
            step="matching",
            description=(
                f"Matched rule: {match.rule_name} (type={match.match_type})"
                if match
                else "No matching rule found"
            ),
            input_value={"bonus_rules_count": len(bonus_rules)},
            output_value=match.model_dump() if match else None,
        )
    )

    if match is None:
        warnings.append("No applicable reward rule matched this transaction.")
        return EvaluationResult(
            effective_reward_inr=ZERO_DECIMAL,
            reward_type=RewardType.NONE,
            breakdown=breakdown,
            warnings=warnings,
        )

    # ------------------------------------------------------------------
    # Step 3: Reward evaluation (cashback or points)
    # ------------------------------------------------------------------
    cashback_amount: Optional[Decimal] = None
    points_result: Optional[PointsResult] = None

    if match.reward_type == RewardType.CASHBACK:
        cashback_amount = evaluate_cashback(txn, match)
        breakdown.append(build_cashback_step(cashback_amount, match))

    elif match.reward_type == RewardType.POINTS:
        points_result = evaluate_points(txn, match)
        breakdown.append(build_points_step(points_result, match))

    else:
        # Future reward types (miles, vouchers) — placeholder
        warnings.append(
            f"Reward type '{match.reward_type.value}' is not yet implemented. No reward computed."
        )
        return EvaluationResult(
            effective_reward_inr=ZERO_DECIMAL,
            reward_type=match.reward_type,
            matched_rule=match,
            applied_rate=match.reward_rate,
            breakdown=breakdown,
            warnings=warnings,
        )

    # ------------------------------------------------------------------
    # Step 4: Cap application
    # ------------------------------------------------------------------
    uncapped = cashback_amount or (
        to_decimal(points_result.rupee_value) if points_result else ZERO_DECIMAL
    )
    cap_config = match.config
    cap_result: CapResult | None = None

    cap_from_config = apply_caps_from_config(
        uncapped_reward=uncapped,
        cumulative_spend=txn.cumulative_spend,
        config=cap_config,
    )
    if cap_from_config.cap_limit > ZERO_DECIMAL:
        cap_result = cap_from_config
        breakdown.append(
            EvaluationStep(
                step="cap",
                description=(
                    f"Cap applied: {cap_result.uncapped_reward} → {cap_result.capped_reward}"
                    + f" (limit={cap_result.cap_limit}, scope={cap_result.cap_scope})"
                ),
                input_value={
                    "uncapped": str(uncapped),
                    "cumulative_spend": str(txn.cumulative_spend),
                    "cap_limit": str(cap_result.cap_limit),
                },
                output_value=cap_result.model_dump(),
            )
        )
        # Adjust cashback/points to capped value
        if cashback_amount is not None:
            cashback_amount = cap_result.capped_reward
        elif points_result is not None:
            # Scale points proportionally when cap reduces rupee value
            if uncapped > ZERO_DECIMAL:
                ratio = cap_result.capped_reward / uncapped
                points_result.earned_points = int(points_result.earned_points * float(ratio))
                points_result.rupee_value = cap_result.capped_reward

    # ------------------------------------------------------------------
    # Step 5: Normalize effective reward value
    # ------------------------------------------------------------------
    effective_reward_inr = compute_effective_reward(cashback_amount, points_result)
    reward_type = normalize_reward_type(cashback_amount, points_result)

    breakdown.append(
        EvaluationStep(
            step="normalization",
            description=f"Normalized effective reward: ₹{effective_reward_inr}",
            input_value={
                "cashback_amount": str(cashback_amount) if cashback_amount is not None else None,
                "points_earned": points_result.earned_points if points_result else None,
                "points_value_inr": str(points_result.rupee_value) if points_result else None,
            },
            output_value=str(effective_reward_inr),
        )
    )

    # ------------------------------------------------------------------
    # Step 6: Build structured result
    # ------------------------------------------------------------------
    explanations: list[str] = []
    if match.match_type is not None:
        explanations.append(f"Matched via {match.match_type.value}: {match.rule_name}")
    if effective_reward_inr > ZERO_DECIMAL:
        if cashback_amount is not None:
            explanations.append(f"Cashback: ₹{cashback_amount} on ₹{txn.amount}")
        if points_result is not None and points_result.earned_points > 0:
            explanations.append(
                f"Points: {points_result.earned_points} pts"
                + f" (₹{points_result.rupee_value} @ ₹{points_result.rupee_value_per_point}/pt)"
            )
    else:
        explanations.append("No reward earned on this transaction.")

    if cap_result and cap_result.was_capped:
        explanations.append(
            f"Capped at ₹{cap_result.capped_reward} ({cap_result.cap_scope.value})"
        )

    return EvaluationResult(
        effective_reward_inr=max(effective_reward_inr, ZERO_DECIMAL),
        reward_type=reward_type,
        cashback_amount=cashback_amount,
        reward_points=points_result.earned_points if points_result else None,
        point_value_inr=points_result.rupee_value if points_result else None,
        matched_rule=match,
        applied_rate=match.reward_rate,
        cap_result=cap_result,
        is_excluded=False,
        breakdown=breakdown,
        warnings=warnings,
        explanations=explanations,
    )