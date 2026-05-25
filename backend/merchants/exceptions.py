"""
Module: backend.merchants.exceptions
Responsibility: Domain-specific exceptions for merchant normalization workflows.

Architectural Boundaries:
- Pure exception classes — no business logic beyond error representation.
- Extends core exceptions for HTTP-compatible responses.
- Used by service and repository layers to signal domain errors.

TODO:
- Add MerchantDeactivatedException if soft-delete is introduced later.
"""

from core.exceptions import ConflictException, NotFoundException


class MerchantNotFoundException(NotFoundException):
    """Raised when a merchant is not found by id or canonical name."""

    def __init__(self, message: str = "Merchant not found"):
        super().__init__(message=message, code="MERCHANT_NOT_FOUND")


class MerchantAlreadyExistsException(ConflictException):
    """Raised when attempting to create a merchant with a duplicate canonical_name."""

    def __init__(
        self, canonical_name: str, existing_id: str | None = None
    ):
        detail = f"Merchant with canonical name '{canonical_name}' already exists"
        if existing_id:
            detail += f" (id: {existing_id})"
        super().__init__(message=detail, code="MERCHANT_ALREADY_EXISTS")


class AliasAlreadyExistsException(ConflictException):
    """Raised when attempting to register a duplicate alias for a merchant."""

    def __init__(self, raw_name: str, merchant_id: str):
        super().__init__(
            message=f"Alias '{raw_name}' already exists for merchant '{merchant_id}'",
            code="ALIAS_ALREADY_EXISTS",
        )


class InvalidMerchantNameException(ValueError):
    """Raised when a raw merchant name is empty or invalid after normalization."""

    def __init__(self, raw_name: str):
        super().__init__(
            f"Invalid merchant name: '{raw_name}' — produces empty normalized output"
        )