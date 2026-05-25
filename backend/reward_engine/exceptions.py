"""
Module: backend.reward_engine.exceptions
Responsibility: Pure exception classes for the deterministic reward engine.

Architectural Boundaries:
- Pure exception definitions — no I/O, no business logic.
- Raised by engine modules when inputs are invalid or computation cannot proceed.
- Never caught internally within the engine; always propagated to the caller.
"""

from __future__ import annotations

from decimal import Decimal


class EngineBaseError(Exception):
    """Base exception for all reward engine errors."""


class InvalidTransactionError(EngineBaseError):
    """Raised when transaction data fails validation before evaluation.

    Examples:
        - Negative transaction amount.
        - Missing required fields (merchant, amount).
    """

    def __init__(self, message: str, *, details: dict | None = None) -> None:
        super().__init__(message)
        self.details = details or {}


class InvalidRuleConfigError(EngineBaseError):
    """Raised when a rule_config is malformed or missing required keys.

    Examples:
        - Reward rate missing from a cashback rule.
        - Exclusion rule missing 'excluded' key.
    """

    def __init__(self, rule_name: str, message: str, *, details: dict | None = None) -> None:
        super().__init__(f"Rule '{rule_name}': {message}")
        self.rule_name = rule_name
        self.details = details or {}


class NoMatchingRuleError(EngineBaseError):
    """Raised when no reward rule applies to a transaction.

    This is a non-fatal condition; callers can fall back to a default
    rate or return a zero-reward result.
    """

    def __init__(self, merchant: str, category: str) -> None:
        super().__init__(
            f"No matching rule found for merchant='{merchant}', category='{category}'"
        )
        self.merchant = merchant
        self.category = category


class CapExceededError(EngineBaseError):
    """Raised when a cap has been fully exhausted for the period.

    This is informational — the caller can use it to set the
    effective reward to zero or return a capped result.
    """

    def __init__(
        self,
        cap_limit: Decimal,
        cumulative: Decimal,
        cap_scope: str,
    ) -> None:
        self.cap_limit = cap_limit
        self.cumulative = cumulative
        self.cap_scope = cap_scope
        super().__init__(
            f"Cap exceeded: limit={cap_limit}, cumulative={cumulative}, scope={cap_scope}"
        )


class RedemptionRateMissingError(EngineBaseError):
    """Raised when points/miles reward type has no declared redemption rate.

    Callers should treat this as zero effective value and surface a warning.
    """

    def __init__(self, reward_type: str, rule_name: str) -> None:
        super().__init__(
            f"Redemption rate missing for '{reward_type}' in rule '{rule_name}'. "
            f"Effective value set to ₹0."
        )
        self.reward_type = reward_type
        self.rule_name = rule_name