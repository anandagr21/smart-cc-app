"""
Module: backend.reward_engine.cap_exceptions
Responsibility: Custom exception hierarchy for the deterministic caps engine.

Architectural Boundaries:
- Pure exception definitions — no I/O, no business logic.
- Provides typed exceptions for cap validation, exhaustion, and matching failures.
- MUST NOT depend on DB models, services, or routes.
"""

from __future__ import annotations

from decimal import Decimal

from reward_engine.constants import ZERO_DECIMAL


class CapEngineError(Exception):
    """Base exception for all cap-engine errors."""

    def __init__(self, message: str = "Cap engine error") -> None:
        self.message = message
        super().__init__(message)


class InvalidCapTypeError(CapEngineError):
    """Raised when a cap type string is unrecognised."""

    def __init__(self, cap_type: str) -> None:
        self.cap_type = cap_type
        super().__init__(f"Invalid cap type: {cap_type}")


class InvalidCapScopeError(CapEngineError):
    """Raised when a cap scope string cannot be mapped to a CapScope enum."""

    def __init__(self, scope: str) -> None:
        self.scope = scope
        super().__init__(f"Invalid cap scope: {scope}")


class CapExhaustedError(CapEngineError):
    """Raised or used when a cap has been fully exhausted (headroom ≤ 0)."""

    def __init__(self, cap_type: str, limit: Decimal = ZERO_DECIMAL) -> None:
        self.cap_type = cap_type
        self.limit = limit
        super().__init__(f"Cap Exhausted: {cap_type} (limit={limit})")


# ---------------------------------------------------------------------------
# Aliases expected by test suite
# ---------------------------------------------------------------------------

# Alias for CapExhaustedError (test imports CapExhaustedException)
CapExhaustedException = CapExhaustedError


class CapInvalidConfigException(CapEngineError):
    """Raised when a cap configuration dict is invalid or incomplete."""

    def __init__(self, reason: str = "Invalid cap configuration", key: str = "", value: str = "") -> None:
        self.reason = reason
        self.key = key
        self.value = value
        super().__init__(f"Invalid cap config: {reason}" + (f" ({key}={value})" if key else ""))


class CapNotFoundException(CapEngineError):
    """Raised when a requested cap type is not found in the rule set."""

    def __init__(self, cap_type: str = "unknown") -> None:
        self.cap_type = cap_type
        super().__init__(f"Cap not found: {cap_type}")


class CapNotApplicableException(CapEngineError):
    """Raised when a cap rule does not apply to the given transaction context."""

    def __init__(self, cap_type: str = "", merchant: str = "", reason: str = "") -> None:
        self.cap_type = cap_type
        self.merchant = merchant
        self.reason = reason
        msg = f"Cap not applicable: {cap_type}"
        if merchant:
            msg += f" (merchant={merchant})"
        if reason:
            msg += f" — {reason}"
        super().__init__(msg)