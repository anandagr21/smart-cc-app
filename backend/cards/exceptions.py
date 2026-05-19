"""
Module: backend.cards.exceptions
Responsibility: Domain-specific exceptions for the Card Management module.

Architectural Boundaries:
- Extends the core AppException hierarchy for card-specific errors.
- Used by card services to raise semantically meaningful errors.
- Caught by the global exception handler in core/middleware.py.
"""

from core.exceptions import (
    AppException,
    ConflictException,
    NotFoundException,
    ValidationException,
)


class CardNotFoundException(NotFoundException):
    """Raised when a card (catalog or user-owned) is not found."""

    def __init__(self, card_id: str, details: dict | None = None):
        super().__init__(
            message=f"Card with id '{card_id}' not found.",
            code="CARD_NOT_FOUND",
            details=details,
        )


class UserCardNotFoundException(NotFoundException):
    """Raised when a user-owned card is not found."""

    def __init__(self, card_id: str, details: dict | None = None):
        super().__init__(
            message=f"User card with id '{card_id}' not found.",
            code="USER_CARD_NOT_FOUND",
            details=details,
        )


class CardAlreadyExistsException(ConflictException):
    """Raised when a user tries to add a duplicate card."""

    def __init__(self, user_id: str, card_catalog_id: str, details: dict | None = None):
        super().__init__(
            message=f"User '{user_id}' already owns card '{card_catalog_id}'.",
            code="DUPLICATE_CARD",
            details=details,
        )


class CardValidationException(ValidationException):
    """Raised when card data fails business validation rules."""

    def __init__(self, message: str, details: dict | None = None):
        super().__init__(
            message=message,
            code="CARD_VALIDATION_ERROR",
            details=details,
        )


class CardCatalogNotFoundException(NotFoundException):
    """Raised when a master catalog card is not found."""

    def __init__(self, card_id: str, details: dict | None = None):
        super().__init__(
            message=f"Card catalog entry with id '{card_id}' not found.",
            code="CARD_CATALOG_NOT_FOUND",
            details=details,
        )