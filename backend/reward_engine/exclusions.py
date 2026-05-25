"""
Module: backend.reward_engine.exclusions
Responsibility: Deterministic exclusion rule evaluation for transactions.

Architectural Boundaries:
- Pure functions — no I/O, no DB access, no side effects.
- Evaluates a transaction against exclusion rules to determine if rewards
  should be denied for that transaction.
- Exclusion rules can filter by merchant, category, or transaction type.

Exclusion types supported (rules with rule_type="exclusion"):
  - Excluded merchants: "excluded_merchants": ["swiggy", "zomato"]
  - Excluded categories: "excluded_categories": ["fuel"]
  - Excluded transaction types: "excluded_transaction_types": ["online", "wallet"]
  - Legacy singular forms: "merchant", "category" also accepted

Config keys:
  - excluded_merchants / merchant: list[str] or str — merchants denied rewards
  - excluded_categories / category: list[str] or str — categories denied rewards
  - excluded_transaction_types: list[str] — transaction types denied rewards
  - reason: str — optional human-readable reason
"""

from __future__ import annotations

from typing import Any, Optional

from reward_engine.constants import (
    KEY_EXCLUDED_CATEGORIES,
    KEY_EXCLUDED_MERCHANTS,
    KEY_EXCLUDED_TXN_TYPES,
    KEY_REASON,
)
from reward_engine.schemas import (
    EvaluationStep,
    ExclusionResult,
    NormalizedRuleConfig,
    TransactionContext,
)

# Alias support: legacy singular forms accepted for backward compatibility
_LEGACY_MERCHANT_KEYS = (KEY_EXCLUDED_MERCHANTS, "merchant")
_LEGACY_CATEGORY_KEYS = (KEY_EXCLUDED_CATEGORIES, "category")


def _match_exclusion_rule(
    txn: TransactionContext,
    rule: NormalizedRuleConfig,
) -> Optional[str]:
    """Check a single exclusion rule against the transaction.

    Args:
        txn: Normalized transaction context.
        rule: A single exclusion rule.

    Returns:
        A human-readable reason string if excluded, or None if not excluded.
    """
    cfg: dict[str, Any] = rule.config

    # --- excluded merchants ---
    excluded_merchants = _resolve_key(cfg, _LEGACY_MERCHANT_KEYS)
    if excluded_merchants is not None:
        if _any_match(excluded_merchants, txn.merchant):
            return cfg.get(KEY_REASON) or f"Merchant '{txn.merchant}' is excluded"

    # --- excluded categories ---
    excluded_categories = _resolve_key(cfg, _LEGACY_CATEGORY_KEYS)
    if excluded_categories is not None:
        if _any_match(excluded_categories, txn.category):
            return cfg.get(KEY_REASON) or f"Category '{txn.category}' is excluded"

    # --- excluded transaction types ---
    excluded_txn_types = cfg.get(KEY_EXCLUDED_TXN_TYPES)
    if excluded_txn_types is not None:
        if _any_match(excluded_txn_types, txn.payment_mode):
            return cfg.get(KEY_REASON) or f"Transaction type '{txn.payment_mode}' is excluded"

    return None


def evaluate_exclusions(
    txn: TransactionContext,
    exclusion_rules: list[NormalizedRuleConfig],
) -> ExclusionResult:
    """Evaluate all exclusion rules against a transaction.

    If ANY exclusion rule matches, the transaction is excluded from rewards.
    The first matching exclusion is reported.

    Rules with ``rule_type="exclusion"`` are always considered active
    (no ``excluded: true`` flag required).

    Args:
        txn: The normalized transaction context.
        exclusion_rules: Normalized exclusion rules to evaluate (pre-filtered).

    Returns:
        An ExclusionResult indicating whether the transaction is excluded.
    """
    for rule in exclusion_rules:
        reason = _match_exclusion_rule(txn, rule)
        if reason is not None:
            return ExclusionResult(
                is_excluded=True,
                reason=reason,
                matched_rule=rule.rule_name,
            )

    return ExclusionResult(is_excluded=False)


def build_exclusion_step(exclusion_result: ExclusionResult) -> EvaluationStep:
    """Build an EvaluationStep documenting the exclusion evaluation.

    Args:
        exclusion_result: The result from evaluate_exclusions.

    Returns:
        An EvaluationStep for the audit trail.
    """
    if exclusion_result.is_excluded:
        return EvaluationStep(
            step="exclusion",
            description=f"Transaction excluded: {exclusion_result.reason}",
            input_value={"rule": exclusion_result.matched_rule},
            output_value="EXCLUDED",
        )
    return EvaluationStep(
        step="exclusion",
        description="No exclusion rules matched. Transaction is eligible.",
        output_value="ELIGIBLE",
    )


def _resolve_key(cfg: dict[str, Any], keys: tuple[str, ...]) -> Optional[Any]:
    """Return the first value found from a sequence of config keys, or None."""
    for k in keys:
        if k in cfg:
            return cfg[k]
    return None


def _any_match(values: Any, needle: str) -> bool:
    """Check if needle matches any value (str or list of str), case-insensitive."""
    n = needle.strip().lower()
    if isinstance(values, list):
        return any(v.strip().lower() == n for v in values if isinstance(v, str))
    if isinstance(values, str):
        return values.strip().lower() == n
    return False
