"""
Module: backend.core.utils
Responsibility: Pure utility functions (dates, strings, pagination).

Architectural Boundaries:
- Pure functions only — no I/O, no database, no network.
- DRY principle: helpers used across modules live here.
- Loose coupling: no dependency on FastAPI, SQLModel, or domain modules.

Decision: A thin utility layer avoids code duplication without introducing
unnecessary abstraction. Domain-specific helpers belong in their respective modules.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any


def utcnow() -> datetime:
    """Return the current UTC datetime with timezone awareness.

    Returns:
        Timezone-aware UTC datetime.

    Usage:
        from core.utils import utcnow
        now = utcnow()
    """
    return datetime.now(UTC)


def safe_get(obj: Any, attr: str, default: Any = None) -> Any:
    """Safely get an attribute or return a default.

    Useful for accessing optional nested properties without try/except blocks.

    Args:
        obj: The object to inspect.
        attr: The attribute name.
        default: Fallback value if attribute doesn't exist.

    Returns:
        The attribute value or the default.
    """
    return getattr(obj, attr, default)


def compute_pagination_meta(
    total: int,
    page: int,
    page_size: int,
) -> dict[str, object]:
    """Compute standard pagination metadata.

    Args:
        total: Total number of records.
        page: Current page number (1-indexed).
        page_size: Number of records per page.

    Returns:
        Dict with keys: total, page, page_size, has_next.

    Usage:
        meta = compute_pagination_meta(total=100, page=1, page_size=20)
    """
    has_next = (page * page_size) < total
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_next": has_next,
    }


def truncate_card_number(card_number: str, visible: int = 4) -> str:
    """Mask a card number for safe logging/display.

    Keeps only the last `visible` digits, replacing the rest with asterisks.

    Args:
        card_number: The full or partial card number.
        visible: Number of trailing digits to keep visible.

    Returns:
        Masked card number string (e.g., '************1234').

    Usage:
        safe = truncate_card_number("4111111111111111")  # -> "************1111"
    """
    clean = "".join(ch for ch in card_number if ch.isdigit())
    if len(clean) <= visible:
        return clean
    return "*" * (len(clean) - visible) + clean[-visible:]


def safe_log_context(obj: object, *attrs: str) -> dict[str, str]:
    """Build a safe key-value dict for structured logging.

    Extracts string representations of the given attributes from an object,
    filtering out any that are None or missing. Useful for building the
    `extra` dict in logger calls without risking AttributeErrors.

    Args:
        obj: Source object.
        *attrs: Attribute names to extract.

    Returns:
        Dict of attribute_name -> str(value), omitting missing values.

    Usage:
        extra = safe_log_context(card, "id", "name")
        logger.info("Processing card", extra=extra)
    """
    result: dict[str, str] = {}
    for attr in attrs:
        value = safe_get(obj, attr)
        if value is not None:
            result[attr] = str(value)
    return result