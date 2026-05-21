"""
Module: backend.reward_engine.caps
Responsibility: Deterministic multi-cap evaluator pipeline.

Architectural Boundaries:
- Pure functions — no I/O, no side effects, no randomness.
- Composes with cap_normalizer, cap_matcher, and cap_utils.
- Returns CapEvaluationResult with full audit trail.
- MUST NOT import from DB layer, services, or routes.

Cap evaluation pipeline:
  1. Accept uncapped reward + sorted applicable CapRules
  2. For each cap (priority order): compute headroom → clamp → track reduction
  3. Generate warnings for near-exhaustion
  4. Return CapEvaluationResult with adjusted_reward + details
"""

from __future__ import annotations

from collections.abc import Iterable
from decimal import Decimal

from reward_engine.cap_schemas import (
    CapApplicationDetail,
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
from reward_engine.constants import ZERO_DECIMAL, CapScope

# ---------------------------------------------------------------------------
# Default headroom: when no headroom state is provided, caps start with
# their full limit available (used for per-transaction caps or first
# evaluation).
# ---------------------------------------------------------------------------
_DEFAULT_HEADROOMS: dict[str, Decimal] = {}


def _resolve_headroom(
    cap: CapRule,
    headrooms: dict[str, Decimal],
) -> Decimal:
    """Look up remaining headroom for a cap rule.

    ``headrooms`` stores **cumulative earned** values keyed by
    ``build_cap_key``.  If a cap has never been tracked, its full limit
    is used as the initial remaining headroom.  Transaction-scoped caps
    always start fresh (full limit).

    Args:
        cap: The cap rule to look up.
        headrooms: Dict of cap_key → cumulative earned (from prior evals).

    Returns:
        The remaining headroom for this cap (never negative).
    """
    # Transaction caps are per-invocation — always full limit.
    if cap.scope == CapScope.PER_TRANSACTION:
        return max(ZERO_DECIMAL, cap.limit)

    key = build_cap_key(cap.cap_type, cap.scope.value, cap.merchant, cap.category)
    cumulative_earned = headrooms.get(key)
    if cumulative_earned is None:
        # First time this cap is tracked — full limit available.
        return max(ZERO_DECIMAL, cap.limit)
    # Already tracked — compute remaining headroom (never negative).
    headroom = cap.limit - cumulative_earned
    return max(ZERO_DECIMAL, headroom)


def _make_detail(
    cap: CapRule,
    reward_before: Decimal,
    reward_after: Decimal,
    headroom_before: Decimal,
    headroom_after: Decimal,
) -> CapApplicationDetail:
    """Create a CapApplicationDetail with derived fields computed.

    Args:
        cap: The cap rule that was applied.
        reward_before: Reward before this cap.
        reward_after: Reward after clamping.
        headroom_before: Headroom before application.
        headroom_after: Headroom after application.

    Returns:
        A fully-populated CapApplicationDetail.
    """
    reduction = compute_cap_reduction(reward_before, reward_after)
    return CapApplicationDetail(
        cap_rule=cap,
        reward_before=reward_before,
        reward_after=reward_after,
        reduction=reduction,
        headroom_before=headroom_before,
        headroom_after=headroom_after,
        is_exhausted=is_cap_exhausted(headroom_after),
    )


def _sort_caps(caps: Iterable[CapRule]) -> list[CapRule]:
    """Sort cap rules by priority (ascending), then by cap_type (stable).

    Args:
        caps: An iterable of CapRule objects.

    Returns:
        A new sorted list of caps.
    """
    return sorted(caps, key=lambda c: (c.priority, c.cap_type))


def evaluate_caps(
    uncapped_reward: Decimal,
    caps: list[CapRule],
    headrooms: dict[str, Decimal] | None = None,
) -> CapEvaluationResult:
    """Evaluate multiple caps against an uncapped reward.

    Caps are applied in priority order (lowest priority first).  Each cap
    uses the cumulative headroom tracked via `headrooms` (or starts with
    its full limit).  The reward is progressively clamped; once it drops
    to zero, remaining caps are skipped but still produce detail entries
    with zero reward_after.

    Args:
        uncapped_reward: The reward value before any caps.
        caps: Applicable cap rules (already filtered by cap_matcher).
        headrooms: Optional cumulative headroom state keyed by
            ``build_cap_key``.  If None, all caps start with full limit.

    Returns:
        CapEvaluationResult with adjusted_reward, caps_applied details,
        remaining_headrooms, total_reduction, warnings, and was_capped flag.

    Example:
        >>> from reward_engine.cap_normalizer import normalize_caps
        >>> from reward_engine.cap_matcher import match_caps
        >>> rules = normalize_caps(raw_configs)
        >>> applicable = match_caps(rules, merchant="Shell", category="fuel")
        >>> result = evaluate_caps(Decimal("200"), applicable)
        >>> result.adjusted_reward
        Decimal('150.00')
    """
    headrooms = headrooms or _DEFAULT_HEADROOMS
    details: list[CapApplicationDetail] = []
    warnings: list[str] = []

    current_reward = max(ZERO_DECIMAL, uncapped_reward)
    # applied_headrooms tracks cumulative earned (same semantics as input headrooms)
    applied_headrooms: dict[str, Decimal] = dict(headrooms)  # shallow copy

    sorted_caps = _sort_caps(caps)

    for cap in sorted_caps:
        if not should_apply_cap(cap.limit):
            # Skip caps with no meaningful limit (limit == 0).
            continue

        key = build_cap_key(cap.cap_type, cap.scope.value, cap.merchant, cap.category)

        # Compute remaining headroom from cumulative earned
        cumulative_earned = applied_headrooms.get(key)
        if cumulative_earned is None:
            # First time this cap is tracked — full limit available.
            headroom_before = max(ZERO_DECIMAL, cap.limit)
        else:
            headroom_before = max(ZERO_DECIMAL, cap.limit - cumulative_earned)

        if current_reward <= ZERO_DECIMAL:
            # Reward already fully consumed — record zero-pass detail.
            detail = _make_detail(
                cap,
                reward_before=ZERO_DECIMAL,
                reward_after=ZERO_DECIMAL,
                headroom_before=headroom_before,
                headroom_after=headroom_before,
            )
            details.append(detail)

            # Keep cumulative earned unchanged
            applied_headrooms[key] = max(ZERO_DECIMAL, cumulative_earned or ZERO_DECIMAL)
            continue

        # Clamp the current reward against this cap's headroom.
        reward_after = clamp_reward(current_reward, headroom_before)
        headroom_after = max(ZERO_DECIMAL, headroom_before - reward_after)

        detail = _make_detail(
            cap,
            reward_before=current_reward,
            reward_after=reward_after,
            headroom_before=headroom_before,
            headroom_after=headroom_after,
        )
        details.append(detail)

        # Update tracked cumulative earned
        new_cumulative = max(ZERO_DECIMAL, cumulative_earned or ZERO_DECIMAL) + reward_after
        applied_headrooms[key] = max(ZERO_DECIMAL, new_cumulative)

        # Generate near-exhaustion warning when applicable.
        if not detail.is_exhausted and is_near_exhaustion(headroom_after, cap.limit):
            scope_desc = cap.merchant or cap.category or cap.scope.value
            warnings.append(
                f"Cap '{cap.cap_type}' for '{scope_desc}' is nearly exhausted "
                f"(₹{headroom_after} remaining of ₹{cap.limit})."
            )

        current_reward = reward_after

    total_reduction = sum_reductions(details)

    return CapEvaluationResult(
        original_reward=uncapped_reward,
        adjusted_reward=current_reward,
        caps_applied=details,
        total_reduction=total_reduction,
        remaining_headrooms=applied_headrooms,
        warnings=warnings,
        was_capped=total_reduction > ZERO_DECIMAL,
    )


# ---------------------------------------------------------------------------
# Legacy single-cap interface (preserved for backward compatibility)
# ---------------------------------------------------------------------------


def apply_caps_from_config(
    uncapped_reward: Decimal,
    cumulative_spend: Decimal,
    config: dict,
) -> "CapResult":
    """Apply caps defined in a rule config dict and return the result.

    This is a convenience wrapper that normalizes caps from a rule config
    and evaluates them against the uncapped reward.

    Args:
        uncapped_reward: The reward value before any caps.
        cumulative_spend: The cumulative spend for the card (used for monthly caps).
        config: The rule config dict containing cap definitions.

    Returns:
        CapResult with capped_reward and cap_limit.
    """
    from reward_engine.cap_normalizer import normalize_caps
    from reward_engine.cap_matcher import match_caps
    from reward_engine.schemas import CapResult
    from reward_engine.cap_exceptions import CapInvalidConfigException

    # Normalize caps from config
    try:
        caps = normalize_caps(config)
    except CapInvalidConfigException:
        caps = []

    if not caps:
        # No caps defined - return uncapped
        return CapResult(
            uncapped_reward=uncapped_reward,
            capped_reward=uncapped_reward,
            cap_limit=ZERO_DECIMAL,
            cap_scope=CapScope.PER_TRANSACTION,
            was_capped=False,
        )

    # For now, just apply the first cap (simplified)
    # In a full implementation, we'd use evaluate_caps with proper matching
    cap = caps[0]
    capped = apply_single_cap(
        uncapped_reward,
        cap.limit,
        cumulative_spend if cap.scope == CapScope.MONTHLY else ZERO_DECIMAL,
        cap.scope,
    )

    return CapResult(
        uncapped_reward=uncapped_reward,
        capped_reward=capped,
        cap_limit=cap.limit,
        cap_scope=cap.scope,
        was_capped=capped < uncapped_reward,
    )


def apply_single_cap(
    uncapped_reward: Decimal,
    cap_limit: Decimal,
    cumulative_earned: Decimal = ZERO_DECIMAL,
    scope: CapScope = CapScope.PER_TRANSACTION,
) -> Decimal:
    """Apply a single cap and return the capped reward value only.

    Convenience wrapper. For rich audit details, use ``evaluate_caps``.

    Args:
        uncapped_reward: Reward before capping.
        cap_limit: Maximum reward allowed.
        cumulative_earned: Rewards already earned in this scope.
        scope: Cap scope (default PER_TRANSACTION).

    Returns:
        Capped reward value.
    """
    if cap_limit <= ZERO_DECIMAL:
        return uncapped_reward
    headroom = compute_headroom(cap_limit, cumulative_earned)
    return clamp_reward(uncapped_reward, headroom)
