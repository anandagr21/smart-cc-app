"""
Module: backend.reward_engine.matcher
Responsibility: Deterministic rule matching for transactions against reward rules.

Architectural Boundaries:
- Pure functions — no I/O, no DB access, no side effects.
- Matches a transaction to applicable reward rules based on merchant,
  category, payment mode, minimum spend, and validity windows.
- Returns the best matching rule via priority-based resolution.

Matching priority (most specific wins):
  1. Exact merchant match (merchant bonus)
  2. Category match (category bonus)
  3. Payment mode match
  4. Default / fallback rules
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Callable, Optional

from reward_engine.constants import (
    KEY_CATEGORY,
    KEY_MERCHANT,
    KEY_MIN_SPEND,
    KEY_PAYMENT_MODE,
    KEY_VALID_FROM,
    KEY_VALID_TO,
    MatchType,
    RewardType,
    ZERO_DECIMAL,
)
from reward_engine.schemas import (
    MatchResult,
    NormalizedRuleConfig,
    TransactionContext,
)
from reward_engine.utils import (
    check_minimum_spend,
    is_within_validity_window,
)


def _resolve_reward_type(config: dict) -> RewardType:
    """Resolve the reward type from a rule's config dict."""
    raw = config.get("reward_type", "cashback")
    try:
        return RewardType(raw)
    except ValueError:
        return RewardType.CASHBACK


def _resolve_payment_mode(config: dict) -> str:
    """Resolve the payment mode filter from a rule's config dict."""
    return config.get(KEY_PAYMENT_MODE, "any")


# ---------------------------------------------------------------------------
# Predicate Validation
# ---------------------------------------------------------------------------

RulePredicate = Callable[["TransactionContext", dict], bool]

def _check_min_spend_predicate(txn: TransactionContext, cfg: dict) -> bool:
    min_spend_raw = cfg.get(KEY_MIN_SPEND)
    min_spend = Decimal(str(min_spend_raw)) if min_spend_raw is not None else ZERO_DECIMAL
    return check_minimum_spend(txn.amount, min_spend)

def _check_validity_predicate(txn: TransactionContext, cfg: dict) -> bool:
    valid_from_raw = cfg.get(KEY_VALID_FROM)
    valid_to_raw = cfg.get(KEY_VALID_TO)
    valid_from = date.fromisoformat(valid_from_raw) if isinstance(valid_from_raw, str) else None
    valid_to = date.fromisoformat(valid_to_raw) if isinstance(valid_to_raw, str) else None
    return is_within_validity_window(txn.transaction_date, valid_from, valid_to)

def _check_payment_mode_predicate(txn: TransactionContext, cfg: dict) -> bool:
    rule_payment_mode = _resolve_payment_mode(cfg)
    if rule_payment_mode != "any":
        txn_pm = txn.payment_mode if isinstance(txn.payment_mode, str) else txn.payment_mode.value
        return rule_payment_mode.lower() == txn_pm.lower()
    return True

_PREDICATES: list[RulePredicate] = [
    _check_min_spend_predicate,
    _check_validity_predicate,
    _check_payment_mode_predicate,
]



from reward_engine.indexer import RuleIndex

def match_rules(
    txn: TransactionContext,
    rules_input: list[NormalizedRuleConfig] | RuleIndex,
) -> MatchResult | None:
    """Find the best matching reward rule for a transaction.

    Evaluates rules against the transaction and returns
    the highest-priority match. Rules are sorted by priority (lower = higher)
    and then by matching specificity.

    Matching checks per rule:
      1. Minimum spend threshold
      2. Validity window (dates)
      3. Payment mode compatibility
      4. Merchant match (exact, case-insensitive)
      5. Category match (case-insensitive)

    Args:
        txn: The normalized transaction context.
        rules_input: A pre-computed RuleIndex or a raw list of rules.

    Returns:
        A MatchResult if a matching rule is found, or None.
    """
    applicable: list[tuple[NormalizedRuleConfig, MatchType]] = []

    if isinstance(rules_input, RuleIndex):
        index = rules_input
    else:
        index = RuleIndex(rules_input)

    # Deterministic ordered merge of candidates: Merchant -> Category -> Payment Mode -> Fallback
    candidates: dict[str, NormalizedRuleConfig] = {}
    
    # helper to add deterministically
    def _add_candidates(rules_subset: list[NormalizedRuleConfig]) -> None:
        for r in rules_subset:
            # use id(r) or a unique hash/name for deduplication.
            # Assuming rule_name is unique per card, but priority+name is safer.
            # Let's use object id(r) to ensure stable identity deduplication without modifying schema.
            r_id = id(r)
            if r_id not in candidates:
                candidates[r_id] = r

    _add_candidates(index.get_merchant_rules(txn.merchant))
    _add_candidates(index.get_category_rules(txn.category))
    txn_pm = txn.payment_mode if isinstance(txn.payment_mode, str) else txn.payment_mode.value
    _add_candidates(index.get_payment_mode_rules(txn_pm))
    _add_candidates(index.get_fallback_rules())

    for rule in candidates.values():
        cfg = rule.config

        # ---- Gate: constraints evaluation ----
        if not all(predicate(txn, cfg) for predicate in _PREDICATES):
            continue

        rule_payment_mode = _resolve_payment_mode(cfg)

        # ---- Match: exact merchant ----
        rule_merchant = cfg.get(KEY_MERCHANT)
        if rule_merchant is not None:
            if rule_merchant.strip().lower() == txn.merchant:
                applicable.append((rule, MatchType.EXACT_MERCHANT))
                continue

        # ---- Match: category ----
        rule_category = cfg.get(KEY_CATEGORY)
        if rule_category is not None:
            if rule_category.strip().lower() == txn.category:
                applicable.append((rule, MatchType.CATEGORY_MATCH))
                continue

        # ---- Match: payment mode only (no merchant/category filter) ----
        if rule_payment_mode != "any":
            applicable.append((rule, MatchType.PAYMENT_MODE))
            continue

        # ---- Match: default (no specific filter) ----
        # Only match default rules when no merchant/category/payment_mode filter exists
        if rule_merchant is None and rule_category is None and rule_payment_mode == "any":
            applicable.append((rule, MatchType.DEFAULT))

    if not applicable:
        return None

    # Pick the best match: lowest priority → most specific match_type
    applicable.sort(key=_match_sort_key)
    best_rule, match_type = applicable[0]

    reward_type = _resolve_reward_type(best_rule.config)
    reward_rate = Decimal(str(best_rule.config.get("reward_rate", 0)))

    return MatchResult(
        rule_name=best_rule.rule_name,
        rule_type=best_rule.rule_type,
        match_type=match_type,
        reward_type=reward_type,
        reward_rate=reward_rate,
        config=best_rule.config,
    )


def _match_sort_key(
    item: tuple[NormalizedRuleConfig, MatchType],
) -> tuple[int, int, Decimal, str]:
    """Sort key: lowest priority first, then most specific match type.
    Ties broken by highest reward rate, then alphabetical rule name.

    MatchType ordering (most → least specific):
      EXACT_MERCHANT (0), CATEGORY_MATCH (1), PAYMENT_MODE (2), DEFAULT (3)
    """
    rule, match_type = item
    match_order = {
        MatchType.EXACT_MERCHANT: 0,
        MatchType.CATEGORY_MATCH: 1,
        MatchType.PAYMENT_MODE: 2,
        MatchType.DEFAULT: 3,
    }
    reward_rate = Decimal(str(rule.config.get("reward_rate", 0)))
    return (rule.priority, match_order.get(match_type, 99), -reward_rate, rule.rule_name)


# -- Structural rule types that are NEVER bonus/generating rules --
_NON_BONUS_RULE_TYPES: frozenset[str] = frozenset({"exclusion", "cap", "spend_threshold"})


def filter_bonus_rules(
    rules: list[NormalizedRuleConfig],
) -> list[NormalizedRuleConfig]:
    """Filter rules to only those that represent bonus/reward logic.

    Excludes restriction rules like exclusions and caps (those are
    handled separately by their respective evaluators).

    A rule is considered "bonus" if:
      - Its rule_type is NOT in _NON_BONUS_RULE_TYPES, AND
      - Its rule_type is in BONUS_RULE_TYPES (canonical), OR
      - Its config.reward_type resolves to CASHBACK or POINTS.

    This allows rules with non-canonical rule_type values (e.g., "points"
    instead of "reward_points") to still be evaluated, while ensuring
    structural rules (exclusion, cap) are never treated as bonux rules.

    Args:
        rules: All normalized rules for a card.

    Returns:
        Only bonus-type rules.
    """
    from rewards.constants import BONUS_RULE_TYPES

    def _is_bonus(rule: NormalizedRuleConfig) -> bool:
        # Structural rules are never bonus
        if rule.rule_type in _NON_BONUS_RULE_TYPES:
            return False
        if rule.rule_type in BONUS_RULE_TYPES:
            return True
        rt = _resolve_reward_type(rule.config)
        return rt in (RewardType.CASHBACK, RewardType.POINTS)

    return [r for r in rules if _is_bonus(r)]


def filter_exclusion_rules(
    rules: list[NormalizedRuleConfig],
) -> list[NormalizedRuleConfig]:
    """Filter rules to only exclusion-type rules.

    Args:
        rules: All normalized rules for a card.

    Returns:
        Only exclusion rules.
    """
    return [r for r in rules if r.rule_type == "exclusion"]


def filter_cap_rules(
    rules: list[NormalizedRuleConfig],
) -> list[NormalizedRuleConfig]:
    """Filter rules to only cap-type rules.

    Args:
        rules: All normalized rules for a card.

    Returns:
        Only cap rules.
    """
    return [r for r in rules if r.rule_type == "cap"]
from card_intelligence.extraction.schemas import RewardRule

def match_transaction_to_rule(transaction: dict, reward_rules: list) -> dict | None:
    import logging
    import time
    logger = logging.getLogger(__name__)
    start_time = time.time()
    logger.debug(f"Starting match_transaction_to_rule for {transaction.get('merchant_name')}")

    try:
        mcc = str(transaction.get('mcc', '')).strip().lower()
        merchant_name = str(transaction.get('merchant_name', '')).strip().lower()
        channel = str(transaction.get('channel', '')).strip().lower()

        best_match = None
        highest_priority = -1

        for rule_data in reward_rules:
            # Parse securely via Pydantic
            try:
                rule = RewardRule(**rule_data)
            except Exception as e:
                logger.error(f"Rule parsing error: {e}")
                continue

            # Hard Exclusion Scan
            excluded = False
            for excl in rule.merchant_exclusions:
                if excl.strip().lower() in merchant_name:
                    excluded = True
                    break
            if excluded:
                continue
            
            cat_name = rule.category_name.lower()
            current_priority = -1
            
            # Explicit Category Tag Check (Priority 2)
            if merchant_name and merchant_name in cat_name:
                current_priority = 2
            elif mcc and mcc in cat_name:
                current_priority = 2
            
            # Channel Multiplier Check (Priority 1)
            elif ("online" in cat_name or "digital wallet" in cat_name) and channel == "online":
                current_priority = 1
            
            # Catch-All Base Rate Layer (Priority 0)
            elif "base rate" in cat_name or "catch-all" in cat_name or "other spends" in cat_name:
                current_priority = 0

            if current_priority > highest_priority:
                highest_priority = current_priority
                best_match = rule_data

        duration = time.time() - start_time
        logger.debug(f"Finished match_transaction_to_rule in {duration:.4f}s. Found match: {best_match is not None}")
        return best_match
        
    except Exception as e:
        logger.exception(f"Legacy fallback handler caught critical exception during transaction rule match: {e}")
        return None
