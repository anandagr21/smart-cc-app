"""
Module: backend.merchants.service
Responsibility: Orchestrates merchant normalization, categorization, and matching workflows.

Architectural Boundaries:
- Coordinates workflows by calling Repositories for data access.
- Orchestrates the normalizer, categorizer, and matcher modules.
- MUST NOT contain HTTP logic (request/response).
- MUST NOT contain direct database queries (use Repositories).
- MUST NOT contain AI/reward logic — pure deterministic orchestration.

TODO (future AI enhancement):
- When an AI-assisted merchant resolution module is built, it can be injected as an
  optional dependency into `find_best_match()` for low-confidence fallback scenarios.
"""

from __future__ import annotations

from uuid import UUID

from merchants.categorizer import categorize, categorize_by_tokens
from merchants.constants import UNKNOWN_CATEGORY
from merchants.exceptions import MerchantNotFoundException
from merchants.matcher import find_best_match as match_merchant
from merchants.matcher import MatchResult
from merchants.normalizer import normalize, normalize_with_tokens
from merchants.repository import AliasRepository, MerchantRepository
from merchants.schemas import (
    MerchantBriefResponse,
    MerchantResponse,
    MerchantSearchResponse,
    NormalizeResponse,
)


class MerchantService:
    """Service for merchant normalization, categorization, and identity management.

    Coordinates:
    - Normalizer: deterministic text pipeline
    - Categorizer: deterministic category mapping
    - Matcher: deterministic merchant matching
    - Repositories: data persistence and retrieval
    """

    def __init__(
        self,
        merchant_repo: MerchantRepository,
        alias_repo: AliasRepository,
    ):
        self._merchant_repo = merchant_repo
        self._alias_repo = alias_repo

    # ------------------------------------------------------------------
    # Normalization
    # ------------------------------------------------------------------

    def normalize_merchant(self, raw_name: str) -> NormalizeResponse:
        """Run the deterministic normalization pipeline on a raw merchant name.

        Returns the canonical normalized form, tokens, and category hint.
        This is a pure CPU-bound operation — no async needed.
        """
        canonical, tokens = normalize_with_tokens(raw_name)
        category = categorize_by_tokens(canonical)
        return NormalizeResponse(
            raw_name=raw_name,
            canonical_name=canonical,
            tokens=tokens,
            category=category if category != UNKNOWN_CATEGORY else None,
        )

    # ------------------------------------------------------------------
    # Categorization
    # ------------------------------------------------------------------

    @staticmethod
    def categorize_merchant(raw_name: str | None = None, tokens: list[str] | None = None) -> str:
        """Deterministic category detection from a raw name or pre-computed tokens.

        At least one of `raw_name` or `tokens` must be provided.
        If tokens are provided, join them into a normalized name string
        for token-hint-based categorization.
        """
        if tokens is not None:
            return categorize_by_tokens(" ".join(tokens))
        if raw_name is None:
            raise ValueError("Either raw_name or tokens must be provided")
        return categorize(normalize(raw_name))

    # ------------------------------------------------------------------
    # Matching
    # ------------------------------------------------------------------

    async def find_best_match(
        self, raw_name: str, *, include_inactive: bool = False
    ) -> MerchantSearchResponse:
        """Find the best-matching canonical merchant for a raw input name.

        The match pipeline runs in priority order:
          1. Exact canonical match
          2. Alias match
          3. Normalized token match
          4. Partial fallback match

        If no merchant exists, returns None with match_type="none".
        """
        canonical, tokens = normalize_with_tokens(raw_name)
        match_result: MatchResult = await match_merchant(
            self._merchant_repo,
            raw_name=raw_name,
            canonical_name=canonical,
            tokens=tokens,
            include_inactive=include_inactive,
        )

        if match_result.merchant is None:
            return MerchantSearchResponse(
                merchant=None,
                match_type=match_result.match_type,
                score=match_result.score,
            )

        response = self._to_response(match_result.merchant)
        return MerchantSearchResponse(
            merchant=response,
            match_type=match_result.match_type,
            score=match_result.score,
        )

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------

    async def create_merchant(self, canonical_name: str, display_name: str | None = None,
                               category: str | None = None,
                               aliases: list[str] | None = None) -> MerchantResponse:
        """Create a canonical merchant with optional aliases.

        If category is not provided, it is auto-detected from the canonical name.
        """
        # Pre-normalize the canonical name
        normalized_canonical, tokens = normalize_with_tokens(canonical_name)

        # Auto-detect category if not provided
        if category is None or category == UNKNOWN_CATEGORY:
            category = categorize_by_tokens(tokens)

        create_data = {
            "canonical_name": normalized_canonical,
            "display_name": display_name or canonical_name,
            "category": category,
            "normalized_tokens": tokens,
        }

        entity = await self._merchant_repo.create(create_data)

        # Register aliases if provided
        if aliases:
            for alias_raw in aliases:
                alias_normalized = normalize(alias_raw)
                await self._alias_repo.create(
                    merchant_id=entity.id,
                    raw_name=alias_raw,
                    normalized_name=alias_normalized,
                    source="manual",
                )

        # Re-fetch with aliases loaded
        entity_with_aliases = await self._merchant_repo.get_by_id_with_aliases(entity.id)
        return self._to_response(entity_with_aliases)

    async def get_merchant(self, merchant_id: UUID) -> MerchantResponse:
        """Get a merchant by ID, including all aliases."""
        entity = await self._merchant_repo.get_by_id_with_aliases(merchant_id)
        return self._to_response(entity)

    async def register_alias(
        self, merchant_id: UUID, raw_name: str, source: str = "manual"
    ) -> MerchantResponse:
        """Register a new alias for an existing merchant.

        The raw_name is normalized before storage.
        """
        alias_normalized = normalize(raw_name)
        await self._alias_repo.create(
            merchant_id=merchant_id,
            raw_name=raw_name,
            normalized_name=alias_normalized,
            source=source,
        )
        entity = await self._merchant_repo.get_by_id_with_aliases(merchant_id)
        return self._to_response(entity)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _to_response(entity) -> MerchantResponse:
        """Convert a Merchant ORM entity to a Pydantic response.

        The aliases relationship must be eagerly loaded (selectinload)
        by the repository before calling this method.
        """
        return MerchantResponse.model_validate(entity)