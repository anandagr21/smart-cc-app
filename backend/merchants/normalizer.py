"""
Module: backend.merchants.normalizer
Responsibility: Deterministic merchant name normalization pipeline.

Architectural Boundaries:
- Pure functions only — no I/O, no database access, no network calls.
- Transforms raw merchant names into normalized token sets usable by
  the matcher and categorizer.
- All transformations are deterministic and reproducible.

Input → Output Examples:
    "DOMINOS PIZZA"        → "dominos"
    "Amazon Pay India"    → "amazon pay"
    "SWIGGY LIMITED"      → "swiggy"
    "IRCTC RAIL"          → "irctc"

TODO:
- Future: consider fuzzy matching fallback for misspelled names
  (requires Levenshtein or similar, stay deterministic).
"""

from __future__ import annotations

import re
from typing import Sequence

from merchants.constants import (
    COMMON_SUFFIXES,
    DESCRIPTOR_WORDS,
    PUNCTUATION_TABLE,
    STOP_WORDS,
)
from merchants.exceptions import InvalidMerchantNameException


# Pre-compiled regex for whitespace normalization.
# Collapses runs of whitespace into a single space.
_WHITESPACE_RE: re.Pattern[str] = re.compile(r"\s+")


def normalize(raw_name: str) -> str:
    """Apply the full deterministic normalization pipeline to a raw merchant name.

    Pipeline stages (in order):
        1. strip leading/trailing whitespace
        2. convert to lowercase
        3. remove punctuation
        4. collapse runs of whitespace into single spaces
        5. split into tokens, remove stop words & common suffixes
        6. deduplicate consecutive identical tokens
        7. join tokens back with spaces

    Args:
        raw_name: The raw merchant name as it appears in a transaction.

    Returns:
        A normalized string of meaningful tokens, lowercase, space-separated.

    Raises:
        InvalidMerchantNameException: If normalization produces an empty string.

    Examples:
        >>> normalize("DOMINOS PIZZA")
        'dominos'
        >>> normalize("Amazon Pay India Pvt Ltd")
        'amazon pay'
        >>> normalize("SWIGGY LIMITED")
        'swiggy'
        >>> normalize("  IRCTC! RAIL?  ")
        'irctc'
        >>> normalize("")
        Traceback (most recent call last):
        ...
        merchants.exceptions.InvalidMerchantNameException
    """
    if not raw_name or not raw_name.strip():
        raise InvalidMerchantNameException(raw_name or "<empty>")

    # Stage 1-2: strip & lowercase
    cleaned: str = raw_name.strip().lower()

    # Stage 3: strip punctuation
    cleaned = cleaned.translate(PUNCTUATION_TABLE)

    # Stage 4: collapse whitespace
    cleaned = _WHITESPACE_RE.sub(" ", cleaned).strip()

    # Stage 5: tokenize, filter stop words & common suffixes
    tokens: list[str] = _tokenize_and_filter(cleaned)

    # Stage 6: deduplicate adjacent identical tokens
    tokens = _deduplicate_tokens(tokens)

    result: str = " ".join(tokens)

    if not result:
        raise InvalidMerchantNameException(raw_name)

    return result


def tokenize(raw_name: str) -> list[str]:
    """Normalize and return tokens without joining into a single string.

    Useful when callers need the token list for partial matching
    or Jaccard-style similarity.

    Args:
        raw_name: Raw merchant name string.

    Returns:
        List of normalized, filtered, deduplicated tokens.
    """
    normalized: str = normalize(raw_name)
    return normalized.split()


def normalize_tokens(raw_name: str) -> frozenset[str]:
    """Return a frozenset of normalized tokens for exact-set matching.

    Order-independent token set — useful for matching when token
    order does not matter (e.g., "Pizza Dominos" vs "Dominos Pizza").

    Args:
        raw_name: Raw merchant name string.

    Returns:
        frozenset of unique normalized tokens.
    """
    return frozenset(tokenize(raw_name))


def normalize_with_tokens(raw_name: str) -> tuple[str, list[str]]:
    """Normalize and return both the canonical string and token list.

    Convenience function that avoids double-processing when callers
    need both the normalized name and the individual tokens.

    Args:
        raw_name: Raw merchant name string.

    Returns:
        A tuple of (normalized_name, list_of_tokens).
        normalized_name is the full normalized string.
        list_of_tokens is the ordered token list (post-filtering & dedup).
    """
    normalized: str = normalize(raw_name)
    tokens: list[str] = normalized.split()
    return normalized, tokens


# ---------------------------------------------------------------------------
# Internal Pipeline Functions
# ---------------------------------------------------------------------------


def _tokenize_and_filter(text: str) -> list[str]:
    """Split text into tokens and remove noise words.

    Tokens are processed in order:
        1. Remove stop words (zero identity signal).
        2. Remove descriptor words (category/type words, not
           *who* the merchant is).
        3. Strip common corporate suffixes from both ends.

    Args:
        text: Pre-cleaned, space-separated token string.

    Returns:
        Filtered list of meaningful identity-bearing tokens.
    """
    raw_tokens: list[str] = text.split()

    # Stage 1: Remove stop words — generic filler that carries
    # zero merchant identity signal.
    filtered: list[str] = [t for t in raw_tokens if t not in STOP_WORDS]

    # Stage 2: Remove trailing descriptor words — words that describe
    # what the merchant sells, not who the merchant is.
    # "DOMINOS PIZZA"    → "dominos"
    # "IRCTC RAIL"        → "irctc"
    #
    # Descriptors are only stripped from the END of the token list,
    # where category descriptors naturally appear. Descriptors at the
    # start of a name are brand-identity (e.g., "Pizza Hut" → "pizza hut",
    # not "hut").
    #
    # Only strip if at least one identity-bearing token remains —
    # when the raw name IS a descriptor word (e.g., "pizza"), keep it.
    while filtered and filtered[-1] in DESCRIPTOR_WORDS and len(filtered) > 1:
        filtered.pop()

    # Stage 3: Strip trailing common corporate suffixes.
    # Only suffixes at the **end** are stripped — we don't want to
    # remove e.g. "ltd" from the middle of a name.
    while filtered and filtered[-1] in COMMON_SUFFIXES:
        filtered.pop()

    # Stage 4: Strip leading common suffixes (rare but possible).
    while filtered and filtered[0] in COMMON_SUFFIXES:
        filtered.pop(0)

    return filtered


def _deduplicate_tokens(tokens: Sequence[str]) -> list[str]:
    """Remove consecutive duplicate tokens while preserving order.

    "pizza pizza dominos" → ["pizza", "dominos"]
    "a a b b c a a"     → ["a", "b", "c", "a"]

    Note: this only removes ADJACENT duplicates, preserving
    non-adjacent repeats — important for names like "pay paytm".
    """
    if not tokens:
        return []

    result: list[str] = [tokens[0]]
    for token in tokens[1:]:
        if token != result[-1]:
            result.append(token)
    return result