"""
Module: backend.core.exceptions
Responsibility: Domain exception hierarchy for consistent error handling.

Architectural Boundaries:
- Defines domain-specific errors that map to HTTP status codes.
- These exceptions are caught by the global exception handler in middleware.
- Services raise these exceptions; they NEVER leak to clients as-is.

Decision: A clean exception hierarchy with an `error_code` (SCREAMING_SNAKE_CASE)
and `status_code` enables the global handler to produce consistent error responses
without knowing domain details. Each exception maps to the API error format
defined in skills/api.md.
"""


class DomainException(Exception):
    """Base exception for all domain-level errors.

    All business-logic errors should extend this class.
    The global exception handler catches DomainException and returns
    a structured error response to the client.
    """

    def __init__(
        self,
        message: str,
        error_code: str = "INTERNAL_ERROR",
        status_code: int = 500,
        details: dict | None = None,
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class NotFoundException(DomainException):
    """Resource not found — maps to HTTP 404."""

    def __init__(
        self,
        message: str = "Resource not found.",
        error_code: str = "NOT_FOUND",
        details: dict | None = None,
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=404,
            details=details,
        )


class ValidationException(DomainException):
    """Invalid input or business rule violation — maps to HTTP 400."""

    def __init__(
        self,
        message: str = "Invalid input.",
        error_code: str = "INVALID_INPUT",
        details: dict | None = None,
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=400,
            details=details,
        )


class ConflictException(DomainException):
    """Duplicate resource or state conflict — maps to HTTP 409."""

    def __init__(
        self,
        message: str = "Resource conflict.",
        error_code: str = "CONFLICT",
        details: dict | None = None,
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=409,
            details=details,
        )


class UnauthorizedException(DomainException):
    """Authentication required — maps to HTTP 401."""

    def __init__(
        self,
        message: str = "Authentication required.",
        error_code: str = "UNAUTHORIZED",
        details: dict | None = None,
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=401,
            details=details,
        )


class ForbiddenException(DomainException):
    """Authenticated but not authorized — maps to HTTP 403."""

    def __init__(
        self,
        message: str = "Access denied.",
        error_code: str = "FORBIDDEN",
        details: dict | None = None,
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=403,
            details=details,
        )