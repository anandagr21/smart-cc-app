"""
Module: backend.merchants.fuzzy
Responsibility: RapidFuzz-based in-memory fuzzy search index for merchant resolution.

Architectural Boundaries:
- Pure search utilities — no DB access, no LLM calls, no business logic.
- Maintains a lazily-built, thread-safe in-memory search index.
- Index is invalidated after alias writes (call invalidate_index()).
- Callers interpret threshold results to decide pipeline stage.

Thresholds (approved configuration):
    Score >= 95   → FUZZY_AUTO     (no LLM needed)
    Score 85-94   → LLM_RECOVERY   (candidates provided, LLM picks best)
    Score 50-84   → LLM_DISCOVERY  (LLM identifies new merchant)
    Score < 50    → UNKNOWN        (no LLM call at all)
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Optional, Sequence
from uuid import UUID

from rapidfuzz import fuzz, process as rf_process

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Score Thresholds
# ---------------------------------------------------------------------------

THRESHOLD_FUZZY_AUTO = 95       # Auto-resolve, no LLM
THRESHOLD_LLM_RECOVERY = 85    # Provide candidates to LLM Recovery
THRESHOLD_LLM_DISCOVERY = 50   # Trigger LLM Discovery for new merchant
# Below 50 → UNKNOWN, no LLM call


# ---------------------------------------------------------------------------
# Index Entry
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class IndexEntry:
    """A single entry in the fuzzy search index."""
    merchant_id: UUID
    merchant_canonical_name: str
    display_name: str
    category: str
    merchant_type: str
    search_text: str  # The normalized text to match against


@dataclass
class FuzzyCandidate:
    """A scored fuzzy match result."""
    merchant_id: UUID
    merchant_canonical_name: str
    display_name: str
    category: str
    merchant_type: str
    score: float  # 0-100, RapidFuzz score
    matched_text: str  # Which alias/canonical was matched


# ---------------------------------------------------------------------------
# In-Memory Index
# ---------------------------------------------------------------------------

_index: list[IndexEntry] = []
_index_valid: bool = False
_index_lock = asyncio.Lock()


def invalidate_index() -> None:
    """Invalidate the in-memory fuzzy index.

    Call this after any alias write or merchant creation to ensure
    subsequent searches pick up the latest data.
    """
    global _index_valid
    _index_valid = False
    logger.debug("Fuzzy merchant index invalidated.")


def is_index_valid() -> bool:
    """Check whether the index is currently valid."""
    return _index_valid


def build_index(entries: list[IndexEntry]) -> None:
    """Populate the in-memory index with provided entries.

    Called by the resolution engine after loading all merchants + aliases
    from the database. Each merchant produces multiple entries (one per
    canonical name, one per alias).

    Args:
        entries: List of IndexEntry objects to search against.
    """
    global _index, _index_valid
    _index = entries
    _index_valid = True
    logger.info("Fuzzy merchant index built with %d entries.", len(entries))


# ---------------------------------------------------------------------------
# Fuzzy Search
# ---------------------------------------------------------------------------

def fuzzy_search(
    query: str,
    top_n: int = 10,
) -> list[FuzzyCandidate]:
    """Search the in-memory index using RapidFuzz token_set_ratio.

    Uses `token_set_ratio` which handles word order variations well
    (e.g., "amazon india" vs "india amazon" both score highly).

    Args:
        query: Normalized input string to search for.
        top_n: Maximum number of candidates to return.

    Returns:
        List of FuzzyCandidate sorted by score descending.
        Empty list if index is empty or no matches above 0.
    """
    if not _index:
        logger.warning("Fuzzy index is empty — no candidates returned.")
        return []

    if not query or not query.strip():
        return []

    search_texts = [entry.search_text for entry in _index]

    # Use token_set_ratio for best results on partial/reordered inputs
    raw_results = rf_process.extract(
        query.strip(),
        search_texts,
        scorer=fuzz.token_set_ratio,
        limit=top_n * 2,  # Fetch extra to deduplicate by merchant_id
    )

    # Deduplicate: keep highest score per merchant_id
    seen_merchant_ids: set[UUID] = set()
    candidates: list[FuzzyCandidate] = []

    for matched_text, score, idx in raw_results:
        if score <= 0:
            continue
        entry = _index[idx]
        if entry.merchant_id in seen_merchant_ids:
            continue
        seen_merchant_ids.add(entry.merchant_id)
        candidates.append(
            FuzzyCandidate(
                merchant_id=entry.merchant_id,
                merchant_canonical_name=entry.merchant_canonical_name,
                display_name=entry.display_name,
                category=entry.category,
                merchant_type=entry.merchant_type,
                score=float(score),
                matched_text=matched_text,
            )
        )
        if len(candidates) >= top_n:
            break

    return sorted(candidates, key=lambda c: c.score, reverse=True)


def get_top_score(candidates: list[FuzzyCandidate]) -> float:
    """Return the highest score from a candidate list, or 0.0 if empty."""
    return candidates[0].score if candidates else 0.0


def classify_score(score: float) -> str:
    """Map a fuzzy score to the pipeline stage it triggers.

    Args:
        score: RapidFuzz score (0-100).

    Returns:
        One of: "FUZZY_AUTO", "LLM_RECOVERY", "LLM_DISCOVERY", "UNKNOWN"
    """
    if score >= THRESHOLD_FUZZY_AUTO:
        return "FUZZY_AUTO"
    elif score >= THRESHOLD_LLM_RECOVERY:
        return "LLM_RECOVERY"
    elif score >= THRESHOLD_LLM_DISCOVERY:
        return "LLM_DISCOVERY"
    else:
        return "UNKNOWN"
