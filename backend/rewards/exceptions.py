"""
Module: backend.rewards.exceptions
Responsibility: Domain-specific exceptions for the reward rule schema module.

Architectural Boundaries:
- Subclasses of core.exceptions.AppException — follows the standard error hierarchy.
- Pure exception classes — no I/O, no database, no business logic.
- Each exception carries a meaningful error code and message for API consumers.
"""

from __future__ import annotations

from core.exceptions import (
    BadRequestException,
    ConflictException,
    NotFoundException,
    ValidationException,
)


class RewardRuleNotFoundException(NotFoundException):
    """Raised when a reward rule does not exist in the database."""

    code = "REWARD_RULE_NOT_FOUND"

    def __init__(self, rule_id: str) -> None:
        super().__init__(
            message=f"Reward rule with id '{rule_id}' not found.",
            code=self.code,
        )


class InvalidRuleTypeException(ValidationException):
    """Raised when an unsupported rule_type is provided."""

    code = "INVALID_RULE_TYPE"

    def __init__(self, rule_type: str, supported_types: str) -> None:
        super().__init__(
            message=f"Invalid rule type '{rule_type}'. Supported types: {supported_types}.",
            code=self.code,
            details={"rule_type": rule_type, "supported_types": supported_types},
        )


class InvalidRuleConfigException(ValidationException):
    """Raised when rule_config JSONB fails schema validation."""

    code = "INVALID_RULE_CONFIG"

    def __init__(self, message: str, *, details: dict | None = None) -> None:
        super().__init__(
            message=message,
            code=self.code,
            details=details or {},
        )


class DuplicateRuleException(ConflictException):
    """Raised when attempting to create a duplicate rule for the same card."""

    code = "DUPLICATE_REWARD_RULE"

    def __init__(self, card_id: str, rule_name: str) -> None:
        super().__init__(
            message=(
                f"A reward rule with name '{rule_name}' already exists for card '{card_id}'."
            ),
            code=self.code,
            details={"card_id": card_id, "rule_name": rule_name},
        )


class InvalidRulePriorityException(BadRequestException):
    """Raised when rule priority is out of valid range."""

    code = "INVALID_RULE_PRIORITY"

    def __init__(self, priority: int, min_val: int = 0, max_val: int = 1000) -> None:
        super().__init__(
            message=f"Rule priority must be between {min_val} and {max_val}. Got {priority}.",
            code=self.code,
            details={"priority": priority, "min": min_val, "max": max_val},
        )