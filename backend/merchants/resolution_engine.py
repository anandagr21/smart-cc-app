"""
Module: backend.merchants.resolution_engine
Responsibility: Main orchestrator for the multi-stage merchant resolution pipeline.

Pipeline (in order):
    Stage 0:   normalize input
    Stage 0.5: cache lookup (bail early on hit)
    Stage 1:   exact alias match (< 10ms target)
    Stage 2:   RapidFuzz fuzzy search (< 50ms target)
               score >= 95  → FUZZY_AUTO
               score 80-94  → Stage 3: LLM Recovery (< 500ms target)
               score 50-79  → Stage 4: LLM Discovery (< 1s target)
               score < 50   → UNKNOWN (no LLM call)
    Final:     emit metrics, cache successful results

Architectural Boundaries:
- Coordinates repository, fuzzy, cache, and llm_resolver modules.
- MUST NOT contain direct SQL queries (use repositories).
- MUST NOT contain HTTP logic.
- Index rebuild is lazy: happens on first call or after invalidation.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from merchants import cache as resolution_cache
from merchants import fuzzy as fuzzy_index
from merchants.fuzzy import FuzzyCandidate, IndexEntry, classify_score
from merchants.llm_resolver import discover, recover
from merchants.models import Merchant, MerchantAlias
from merchants.normalizer import normalize_with_tokens
from merchants.pending_review_repository import MetricsRepository, PendingReviewRepository

logger = logging.getLogger(__name__)

# Minimum LLM Discovery confidence to create a pending review record
_DISCOVERY_AUTO_QUEUE_THRESHOLD = 0.90


# ---------------------------------------------------------------------------
# Response
# ---------------------------------------------------------------------------

@dataclass
class ResolutionResult:
    """The outcome of a resolution pipeline run."""
    merchant_id: Optional[UUID]
    merchant_name: Optional[str]
    category: str
    merchant_type: str
    confidence: float
    resolution_type: str  # ALIAS, FUZZY_AUTO, LLM_RECOVERY, LLM_DISCOVERY, UNKNOWN
    requires_confirmation: bool = False
    pending_review_id: Optional[UUID] = None  # Set when LLM_DISCOVERY queues a record


# ---------------------------------------------------------------------------
# Index Loader
# ---------------------------------------------------------------------------

async def _load_index(session: AsyncSession) -> None:
    """Load all merchants and aliases into the fuzzy search index.

    Builds IndexEntry records for both canonical names and all active aliases.
    Each alias creates a separate searchable entry pointing to the same merchant_id.
    """
    # Fetch all active merchants
    merchants_result = await session.execute(
        select(Merchant).where(Merchant.is_active == True)
    )
    merchants = merchants_result.scalars().all()

    # Fetch all active aliases
    aliases_result = await session.execute(
        select(MerchantAlias).where(MerchantAlias.is_active == True)
    )
    aliases = aliases_result.scalars().all()

    # Build alias → merchant lookup
    alias_map: dict[UUID, Merchant] = {m.id: m for m in merchants}

    entries: list[IndexEntry] = []

    # Add canonical name entries
    for m in merchants:
        entries.append(IndexEntry(
            merchant_id=m.id,
            merchant_canonical_name=m.canonical_name,
            display_name=m.display_name or m.canonical_name,
            category=m.category,
            merchant_type=m.merchant_type,
            search_text=m.canonical_name,
        ))

    # Add alias entries (deduplicated by canonical_name per merchant)
    for alias in aliases:
        merchant = alias_map.get(alias.merchant_id)
        if merchant is None:
            continue
        entries.append(IndexEntry(
            merchant_id=merchant.id,
            merchant_canonical_name=merchant.canonical_name,
            display_name=merchant.display_name or merchant.canonical_name,
            category=merchant.category,
            merchant_type=merchant.merchant_type,
            search_text=alias.normalized_name,
        ))

    fuzzy_index.build_index(entries)
    logger.info("Fuzzy index built: %d merchants, %d aliases → %d entries", 
                len(merchants), len(aliases), len(entries))


# ---------------------------------------------------------------------------
# Stage 1 — Alias Lookup
# ---------------------------------------------------------------------------

async def _alias_match(normalized_input: str, session: AsyncSession) -> Optional[Merchant]:
    """Exact normalized alias lookup in the database."""
    result = await session.execute(
        select(MerchantAlias)
        .where(MerchantAlias.normalized_name == normalized_input)
        .where(MerchantAlias.is_active == True)
    )
    alias = result.scalar_one_or_none()
    if alias is None:
        # Also try exact canonical name match
        merchant_result = await session.execute(
            select(Merchant)
            .where(Merchant.canonical_name == normalized_input)
            .where(Merchant.is_active == True)
        )
        return merchant_result.scalar_one_or_none()

    # Fetch the parent merchant
    merchant_result = await session.execute(
        select(Merchant).where(Merchant.id == alias.merchant_id)
    )
    return merchant_result.scalar_one_or_none()


# ---------------------------------------------------------------------------
# Main Resolution Pipeline
# ---------------------------------------------------------------------------

async def resolve(
    raw_input: str,
    session: AsyncSession,
) -> ResolutionResult:
    """Resolve a raw merchant name to a canonical merchant record.

    Runs the full resolution pipeline:
        cache → alias → fuzzy → LLM Recovery / Discovery → metrics

    Args:
        raw_input: Raw merchant name as entered by the user.
        session: Async database session.

    Returns:
        ResolutionResult with the best match (or UNKNOWN if unresolvable).
    """
    # Stage 0: Normalize
    try:
        normalized_input, _tokens = normalize_with_tokens(raw_input)
    except Exception:
        # Normalization failed (empty input, etc.)
        return ResolutionResult(
            merchant_id=None,
            merchant_name=None,
            category="unknown",
            merchant_type="UNKNOWN",
            confidence=0.0,
            resolution_type="UNKNOWN",
            requires_confirmation=False,
        )

    # Stage 0.5: Cache lookup
    cached = resolution_cache.get(normalized_input)
    if cached:
        _emit_metric_sync(session, MetricsRepository(session), normalized_input, cached.resolution_type,
                          cached.confidence, cache_hit=True,
                          merchant_id=UUID(cached.merchant_id) if cached.merchant_id else None)
        return ResolutionResult(
            merchant_id=UUID(cached.merchant_id) if cached.merchant_id else None,
            merchant_name=cached.merchant_name,
            category=cached.category,
            merchant_type=cached.merchant_type,
            confidence=cached.confidence,
            resolution_type=cached.resolution_type,
            requires_confirmation=False,
        )

    metrics_repo = MetricsRepository(session)
    pending_repo = PendingReviewRepository(session)

    # Stage 1: Exact alias match
    merchant = await _alias_match(normalized_input, session)
    if merchant:
        resolution_cache.put(
            normalized_input,
            merchant_id=str(merchant.id),
            merchant_name=merchant.display_name or merchant.canonical_name,
            category=merchant.category,
            merchant_type=merchant.merchant_type,
            confidence=1.0,
            resolution_type="ALIAS",
        )
        await metrics_repo.record(
            raw_input=raw_input, normalized_input=normalized_input,
            resolution_type="ALIAS", confidence=1.0, merchant_id=merchant.id,
        )
        return ResolutionResult(
            merchant_id=merchant.id,
            merchant_name=merchant.display_name or merchant.canonical_name,
            category=merchant.category,
            merchant_type=merchant.merchant_type,
            confidence=1.0,
            resolution_type="ALIAS",
        )

    # Ensure index is loaded before fuzzy search
    if not fuzzy_index.is_index_valid():
        await _load_index(session)

    # Stage 2: Fuzzy search
    candidates: list[FuzzyCandidate] = fuzzy_index.fuzzy_search(normalized_input, top_n=10)
    top_score = fuzzy_index.get_top_score(candidates)
    stage = classify_score(top_score)

    logger.debug(
        "Fuzzy search: input=%r, top_score=%.1f, stage=%s, candidates=%d",
        normalized_input, top_score, stage, len(candidates)
    )

    if stage == "FUZZY_AUTO" and candidates:
        best = candidates[0]
        resolution_cache.put(
            normalized_input,
            merchant_id=str(best.merchant_id),
            merchant_name=best.display_name,
            category=best.category,
            merchant_type=best.merchant_type,
            confidence=round(best.score / 100, 4),
            resolution_type="FUZZY_AUTO",
        )
        await metrics_repo.record(
            raw_input=raw_input, normalized_input=normalized_input,
            resolution_type="FUZZY_AUTO",
            confidence=round(best.score / 100, 4),
            fuzzy_score=best.score,
            merchant_id=best.merchant_id,
        )
        return ResolutionResult(
            merchant_id=best.merchant_id,
            merchant_name=best.display_name,
            category=best.category,
            merchant_type=best.merchant_type,
            confidence=round(best.score / 100, 4),
            resolution_type="FUZZY_AUTO",
        )

    elif stage == "LLM_RECOVERY" and candidates:
        # Stage 3: LLM Recovery — let LLM pick best from candidates
        candidate_names = [c.display_name for c in candidates[:5]]
        llm_result = await recover(normalized_input, candidate_names)

        if llm_result.merchant_name != "UNKNOWN" and llm_result.confidence >= 0.7:
            # Find the matching candidate by name
            matched = next(
                (c for c in candidates if c.display_name.lower() == llm_result.merchant_name.lower()),
                candidates[0],
            )
            confidence = round(llm_result.confidence, 4)
            resolution_cache.put(
                normalized_input,
                merchant_id=str(matched.merchant_id),
                merchant_name=matched.display_name,
                category=matched.category,
                merchant_type=matched.merchant_type,
                confidence=confidence,
                resolution_type="LLM_RECOVERY",
            )
            await metrics_repo.record(
                raw_input=raw_input, normalized_input=normalized_input,
                resolution_type="LLM_RECOVERY", confidence=confidence,
                fuzzy_score=top_score, llm_called=True, merchant_id=matched.merchant_id,
            )
            return ResolutionResult(
                merchant_id=matched.merchant_id,
                merchant_name=matched.display_name,
                category=matched.category,
                merchant_type=matched.merchant_type,
                confidence=confidence,
                resolution_type="LLM_RECOVERY",
            )
        # LLM Recovery returned UNKNOWN — fall through to UNKNOWN
        await metrics_repo.record(
            raw_input=raw_input, normalized_input=normalized_input,
            resolution_type="UNKNOWN", confidence=0.0,
            fuzzy_score=top_score, llm_called=True,
        )
        return ResolutionResult(
            merchant_id=None, merchant_name=None,
            category="unknown", merchant_type="UNKNOWN",
            confidence=0.0, resolution_type="UNKNOWN",
        )

    elif stage == "LLM_DISCOVERY":
        # Stage 4: LLM Discovery — identify a potentially new merchant
        discovery = await discover(normalized_input)

        if discovery.merchant_name != "UNKNOWN" and discovery.confidence >= _DISCOVERY_AUTO_QUEUE_THRESHOLD:
            # Queue for admin review
            pending = await pending_repo.create_pending(raw_input=normalized_input, llm_result=discovery)
            await metrics_repo.record(
                raw_input=raw_input, normalized_input=normalized_input,
                resolution_type="LLM_DISCOVERY", confidence=discovery.confidence,
                fuzzy_score=top_score, llm_called=True,
            )
            return ResolutionResult(
                merchant_id=None,
                merchant_name=discovery.merchant_name,
                category=discovery.category,
                merchant_type=discovery.merchant_type,
                confidence=discovery.confidence,
                resolution_type="LLM_DISCOVERY",
                requires_confirmation=False,
                pending_review_id=pending.id,
            )
        else:
            # Low confidence — ask user
            await metrics_repo.record(
                raw_input=raw_input, normalized_input=normalized_input,
                resolution_type="UNKNOWN", confidence=discovery.confidence,
                fuzzy_score=top_score, llm_called=True,
            )
            return ResolutionResult(
                merchant_id=None, merchant_name=discovery.merchant_name,
                category="unknown", merchant_type="UNKNOWN",
                confidence=discovery.confidence, resolution_type="UNKNOWN",
                requires_confirmation=True,
            )

    else:
        # Score < 50 or no candidates — UNKNOWN, no LLM call
        await metrics_repo.record(
            raw_input=raw_input, normalized_input=normalized_input,
            resolution_type="UNKNOWN", confidence=0.0,
            fuzzy_score=top_score, llm_called=False,
        )
        return ResolutionResult(
            merchant_id=None, merchant_name=None,
            category="unknown", merchant_type="UNKNOWN",
            confidence=0.0, resolution_type="UNKNOWN",
        )


def _emit_metric_sync(
    session: AsyncSession,
    metrics_repo: MetricsRepository,
    normalized_input: str,
    resolution_type: str,
    confidence: float,
    cache_hit: bool = False,
    merchant_id: Optional[UUID] = None,
) -> None:
    """Non-awaited metric emission (fire-and-forget for cache hits)."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            task = loop.create_task(
                metrics_repo.record(
                    raw_input=normalized_input,
                    normalized_input=normalized_input,
                    resolution_type=resolution_type,
                    confidence=confidence,
                    cache_hit=cache_hit,
                    merchant_id=merchant_id,
                ),
                name=f"emit_metric_{resolution_type}",
            )

            def _log_exception(fut: asyncio.Task) -> None:
                try:
                    fut.result()
                except Exception:
                    logger.exception("Fire-and-forget metric emission failed")

            task.add_done_callback(_log_exception)
    except Exception as e:
        logger.debug("Could not emit cache hit metric: %s", e)
