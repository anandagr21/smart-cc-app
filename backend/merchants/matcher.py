"""
Module: backend.merchants.matcher
Responsibility: Merchant matching engine — resolves raw names to canonical merchants.

Architectural Boundaries:
- Pure functions for match scoring; service layer provides DB-dependent matching.
- Deterministic matching pipeline with no AI/ML dependency.
- Matcher utilities are composable and testable in isolation.

Matching Priority Order:
    1. exact canonical match
    2. alias match
    3. normalized token match
    4. partial fallback match

TODO:
- Add Jaccard similarity for fuzzy fallback when exact and token matches fail.
- Score confidence levels for each match tier.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import TYPE_CHECKING, Sequence

from merchants.models import Merchant as MerchantModel

if TYPE_CHECKING:
    from merchants.repository import MerchantRepository


class MatchTier(str, Enum):
    """The quality tier of a merchant match.

    Lower numeric values indicate higher confidence.
    """

    EXACT_CANONICAL = "exact_canonical"
    ALIAS = "alias"
    NORMALIZED_TOKEN = "normalized_token"
    PARTIAL_FALLBACK = "partial_fallback"
    NONE = "none"

    @property
    def priority(self) -> int:
        """Numeric priority — lower is better match."""
        _priority_map: dict[MatchTier, int] = {
            MatchTier.EXACT_CANONICAL: 1,
            MatchTier.ALIAS: 2,
            MatchTier.NORMALIZED_TOKEN: 3,
            MatchTier.PARTIAL_FALLBACK: 4,
            MatchTier.NONE: 5,
        }
        return _priority_map[self]


# ---------------------------------------------------------------------------
# Match Confidence
# ---------------------------------------------------------------------------


def compute_confidence(tier: MatchTier, token_overlap: int = 0) -> float:
    """Compute a match confidence score based on tier and optional token overlap.

    Args:
        tier: The match tier achieved.
        token_overlap: Number of tokens that matched (for partial fallback).

    Returns:
        A confidence score between 0.0 (no match) and 1.0 (exact canonical).
    """
    base_confidence: dict[MatchTier, float] = {
        MatchTier.EXACT_CANONICAL: 1.0,
        MatchTier.ALIAS: 0.95,
        MatchTier.NORMALIZED_TOKEN: 0.85,
        MatchTier.PARTIAL_FALLBACK: 0.5,
        MatchTier.NONE: 0.0,
    }
    base: float = base_confidence.get(tier, 0.0)
    if tier == MatchTier.PARTIAL_FALLBACK and token_overlap > 0:
        # Scale partial confidence by token overlap: min 0.3, max 0.7
        base = 0.3 + 0.4 * min(token_overlap / 5, 1.0)
    return round(base, 4)


# ---------------------------------------------------------------------------
# Token Scoring Utilities (pure functions)
# ---------------------------------------------------------------------------


def token_overlap_count(tokens_a: frozenset[str], tokens_b: frozenset[str]) -> int:
    """Count the number of overlapping tokens between two token sets."""
    return len(tokens_a & tokens_b)


def jaccard_similarity(
    tokens_a: frozenset[str], tokens_b: frozenset[str]
) -> float:
    """Compute Jaccard similarity (intersection / union) of two token sets.

    Returns 0.0 if both sets are empty.
    """
    if not tokens_a and not tokens_b:
        return 1.0
    if not tokens_a or not tokens_b:
        return 0.0
    intersection: int = len(tokens_a & tokens_b)
    union: int = len(tokens_a | tokens_b)
    return intersection / union if union > 0 else 0.0


def partial_match_score(
    normalized_tokens: frozenset[str],
    candidate_tokens: frozenset[str],
) -> float:
    """Score a partial match between two token sets.

    Uses the ratio of overlapping tokens to the query token count.
    This is more generous than Jaccard — it rewards candidates that
    contain all query tokens even if they have many extra tokens.

    Args:
        normalized_tokens: The query token set (from raw input).
        candidate_tokens: The candidate token set (from DB merchant).

    Returns:
        A score from 0.0 (no overlap) to 1.0 (full containment).
    """
    if not normalized_tokens:
        return 0.0
    overlap: int = token_overlap_count(normalized_tokens, candidate_tokens)
    return overlap / len(normalized_tokens)


def is_partial_subset(
    normalized_tokens: frozenset[str],
    candidate_tokens: frozenset[str],
    threshold: float = 0.5,
) -> bool:
    """Check if the candidate tokens partially match the normalized tokens.

    Returns True if at least `threshold` fraction of the normalized tokens
    are found in the candidate token set.
    """
    return partial_match_score(normalized_tokens, candidate_tokens) >= threshold


# ---------------------------------------------------------------------------
# Match Result
# ---------------------------------------------------------------------------


@dataclass
class MatchResult:
    """Result of matching a raw merchant name against the merchant catalog.

    Attributes:
        tier: The quality tier of the match (MatchTier enum).
        merchant: The resolved canonical merchant model, or None if no match.
        match_type: String representation of the tier (for API responses).
        score: Match confidence score (0.0 to 1.0), derived from tier.
        canonical_name: The canonical name of the matched merchant.
    """

    tier: MatchTier
    merchant: MerchantModel | None = None
    match_type: str = "none"
    score: float = 0.0

    @property
    def canonical_name(self) -> str | None:
        """Derived from merchant model if available."""
        return self.merchant.canonical_name if self.merchant else None

    @property
    def is_match(self) -> bool:
        """True if a canonical merchant was identified."""
        return self.tier != MatchTier.NONE and self.merchant is not None


# ---------------------------------------------------------------------------
# Primary Matching Pipeline (async, DB-aware)
# ---------------------------------------------------------------------------


async def find_best_match(
    repo: MerchantRepository,
    raw_name: str,
    canonical_name: str,
    tokens: list[str],
    *,
    include_inactive: bool = False,
) -> MatchResult:
    """Find the best-matching canonical merchant using the priority pipeline.

    Priority order:
        1. Exact canonical name match
        2. Alias match via normalized name
        3. Normalized token match (JSONB overlap)
        4. Partial fallback (best token overlap)

    Args:
        repo: MerchantRepository for database lookups.
        raw_name: The original raw merchant name.
        canonical_name: Normalized canonical form of the raw name.
        tokens: Normalized token list from the raw name.
        include_inactive: Whether to include inactive merchants in search.

    Returns:
        A MatchResult with the best match (or NONE tier if no match found).
    """
    # Priority 1: Exact canonical match
    merchant = await repo.search_normalized(
        canonical_name, include_inactive=include_inactive
    )
    if merchant is not None:
        return MatchResult(
            tier=MatchTier.EXACT_CANONICAL,
            merchant=merchant,
            match_type=MatchTier.EXACT_CANONICAL.value,
            score=compute_confidence(MatchTier.EXACT_CANONICAL),
        )

    # Priority 2: Alias match
    merchant = await repo.search_by_alias(
        canonical_name, include_inactive=include_inactive
    )
    if merchant is not None:
        return MatchResult(
            tier=MatchTier.ALIAS,
            merchant=merchant,
            match_type=MatchTier.ALIAS.value,
            score=compute_confidence(MatchTier.ALIAS),
        )

    # Priority 3: Normalized token match (DB-based JSONB overlap)
    token_matches = await repo.search_by_tokens(
        tokens, include_inactive=include_inactive, limit=10
    )
    if token_matches:
        best = _pick_best_token_match(tokens, token_matches, threshold=1.0)
        if best is not None:
            overlap = token_overlap_count(
                frozenset(tokens), frozenset(best.normalized_tokens or [])
            )
            return MatchResult(
                tier=MatchTier.NORMALIZED_TOKEN,
                merchant=best,
                match_type=MatchTier.NORMALIZED_TOKEN.value,
                score=compute_confidence(MatchTier.NORMALIZED_TOKEN, token_overlap=overlap),
            )

        # Priority 4: Partial fallback (lower threshold)
        best = _pick_best_token_match(tokens, token_matches, threshold=0.3)
        if best is not None:
            overlap = token_overlap_count(
                frozenset(tokens), frozenset(best.normalized_tokens or [])
            )
            return MatchResult(
                tier=MatchTier.PARTIAL_FALLBACK,
                merchant=best,
                match_type=MatchTier.PARTIAL_FALLBACK.value,
                score=compute_confidence(MatchTier.PARTIAL_FALLBACK, token_overlap=overlap),
            )

    # No match
    return MatchResult(
        tier=MatchTier.NONE,
        match_type=MatchTier.NONE.value,
        score=0.0,
    )


# ---------------------------------------------------------------------------
# Internal Helpers
# ---------------------------------------------------------------------------


def _pick_best_token_match(
    query_tokens: list[str],
    candidates: Sequence[MerchantModel],
    threshold: float,
) -> MerchantModel | None:
    """Select the best candidate from token-matched merchants.

    Uses partial_match_score to rank by token overlap, then breaks
    ties by preferring active merchants.

    Args:
        query_tokens: The normalized tokens from the input.
        candidates: Merchants found via token overlap search.
        threshold: Minimum partial_match_score required.

    Returns:
        The highest-scoring merchant above threshold, or None.
    """
    query_set = frozenset(query_tokens)
    best: MerchantModel | None = None
    best_score: float = 0.0

    for candidate in candidates:
        candidate_set = frozenset(candidate.normalized_tokens or [])
        score = partial_match_score(query_set, candidate_set)
        if score > best_score and score >= threshold:
            best_score = score
            best = candidate
        elif score == best_score and candidate.is_active and (
            best is not None and not best.is_active
        ):
            # Prefer active merchants on tie
            best = candidate

    return best