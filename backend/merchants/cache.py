"""
Module: backend.merchants.cache
Responsibility: In-process TTL cache for successful merchant resolutions.

Architectural Boundaries:
- Zero external dependencies — pure Python dict + time-based TTL.
- Only caches successful resolutions: ALIAS, FUZZY_AUTO, LLM_RECOVERY, USER_CONFIRMED.
- Never caches: UNKNOWN, LLM_DISCOVERY (pending), requires_confirmation=True.
- Cache key is the normalized input string.
- Can be swapped to Redis by implementing the same interface.

Rationale for selective caching:
    If "flipkrt" is incorrectly resolved as UNKNOWN and cached, subsequent
    resolutions after alias learning would still return the cached UNKNOWN.
    Only cache when we're confident in the result.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)

# TTL: 30 days in seconds
_DEFAULT_TTL_SECONDS = 30 * 24 * 60 * 60

# Resolution types that are safe to cache
_CACHEABLE_TYPES = {"ALIAS", "FUZZY_AUTO", "LLM_RECOVERY", "USER_CONFIRMED"}


@dataclass
class CachedResolution:
    """A cached resolution result with TTL metadata."""
    merchant_id: Optional[str]
    merchant_name: Optional[str]
    category: str
    merchant_type: str
    confidence: float
    resolution_type: str
    expires_at: float  # Unix timestamp


# In-process cache: normalized_input → CachedResolution
_cache: dict[str, CachedResolution] = {}


def get(normalized_input: str) -> Optional[CachedResolution]:
    """Retrieve a cached resolution for the given normalized input.

    Returns None if the key is not cached or has expired.
    Expired entries are cleaned up lazily on access.

    Args:
        normalized_input: Normalized form of the user's raw input.

    Returns:
        CachedResolution if valid cache hit, else None.
    """
    entry = _cache.get(normalized_input)
    if entry is None:
        return None

    now = time.monotonic()
    if now > entry.expires_at:
        # Lazy expiry
        del _cache[normalized_input]
        logger.debug("Cache expired for key: %s", normalized_input)
        return None

    logger.debug("Cache HIT for key: %s (type=%s)", normalized_input, entry.resolution_type)
    return entry


def put(
    normalized_input: str,
    merchant_id: Optional[str],
    merchant_name: Optional[str],
    category: str,
    merchant_type: str,
    confidence: float,
    resolution_type: str,
    ttl_seconds: int = _DEFAULT_TTL_SECONDS,
) -> bool:
    """Cache a resolution result if it is a cacheable resolution type.

    Args:
        normalized_input: Normalized form of the user's raw input (cache key).
        merchant_id: Resolved merchant UUID as string, or None.
        merchant_name: Human-friendly merchant name, or None.
        category: Merchant category.
        merchant_type: Merchant type (BRAND, UTILITY, etc.)
        confidence: Resolution confidence (0.0-1.0).
        resolution_type: One of ALIAS, FUZZY_AUTO, LLM_RECOVERY, USER_CONFIRMED, etc.
        ttl_seconds: Time-to-live in seconds.

    Returns:
        True if the entry was cached, False if it was intentionally skipped.
    """
    if resolution_type not in _CACHEABLE_TYPES:
        logger.debug(
            "Skipping cache for resolution_type=%s (key=%s)", resolution_type, normalized_input
        )
        return False

    _cache[normalized_input] = CachedResolution(
        merchant_id=merchant_id,
        merchant_name=merchant_name,
        category=category,
        merchant_type=merchant_type,
        confidence=confidence,
        resolution_type=resolution_type,
        expires_at=time.monotonic() + ttl_seconds,
    )
    logger.debug("Cache SET for key: %s (type=%s)", normalized_input, resolution_type)
    return True


def invalidate(normalized_input: str) -> bool:
    """Remove a specific entry from the cache.

    Called after alias learning to ensure the next resolution
    hits the database instead of returning a stale cached result.

    Args:
        normalized_input: Cache key to invalidate.

    Returns:
        True if entry was present and removed, False if not found.
    """
    if normalized_input in _cache:
        del _cache[normalized_input]
        logger.debug("Cache INVALIDATED for key: %s", normalized_input)
        return True
    return False


def clear_all() -> int:
    """Clear the entire cache. Returns number of entries cleared."""
    count = len(_cache)
    _cache.clear()
    logger.info("Resolution cache cleared (%d entries removed).", count)
    return count


def stats() -> dict[str, int]:
    """Return basic cache statistics."""
    now = time.monotonic()
    active = sum(1 for v in _cache.values() if v.expires_at > now)
    return {
        "total_entries": len(_cache),
        "active_entries": active,
        "expired_entries": len(_cache) - active,
    }
