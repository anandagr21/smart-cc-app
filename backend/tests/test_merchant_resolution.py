"""
Tests for the Merchant Resolution Engine.

Tests the full pipeline in isolation (no DB, no LLM) using the fuzzy module
and cache module directly, and validates all 4 resolution stages by threshold.

Run with:
    pytest tests/test_merchant_resolution.py -v
"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from merchants.cache import CachedResolution, get, put, invalidate, stats, clear_all
from merchants.fuzzy import (
    IndexEntry,
    build_index,
    classify_score,
    fuzzy_search,
    get_top_score,
    invalidate_index,
)


# ---------------------------------------------------------------------------
# Fuzzy Module Tests
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def reset_fuzzy_index():
    """Ensure a clean fuzzy index before each test."""
    invalidate_index()
    clear_all()
    yield
    invalidate_index()
    clear_all()


def _make_index():
    """Build a representative fuzzy index for testing."""
    entries = [
        IndexEntry(
            merchant_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
            merchant_canonical_name="flipkart",
            display_name="Flipkart",
            category="ecommerce",
            merchant_type="BRAND",
            search_text="flipkart",
        ),
        IndexEntry(
            merchant_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
            merchant_canonical_name="flipkart",
            display_name="Flipkart",
            category="ecommerce",
            merchant_type="BRAND",
            search_text="flipcart",  # known alias
        ),
        IndexEntry(
            merchant_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
            merchant_canonical_name="flipkart",
            display_name="Flipkart",
            category="ecommerce",
            merchant_type="BRAND",
            search_text="fk internet",  # known alias
        ),
        IndexEntry(
            merchant_id=uuid.UUID("00000000-0000-0000-0000-000000000002"),
            merchant_canonical_name="swiggy",
            display_name="Swiggy",
            category="food",
            merchant_type="BRAND",
            search_text="swiggy",
        ),
        IndexEntry(
            merchant_id=uuid.UUID("00000000-0000-0000-0000-000000000003"),
            merchant_canonical_name="zomato",
            display_name="Zomato",
            category="food",
            merchant_type="BRAND",
            search_text="zomato",
        ),
        IndexEntry(
            merchant_id=uuid.UUID("00000000-0000-0000-0000-000000000004"),
            merchant_canonical_name="amazon",
            display_name="Amazon",
            category="ecommerce",
            merchant_type="BRAND",
            search_text="amazon",
        ),
    ]
    build_index(entries)


class TestFuzzySearch:
    def test_exact_match_scores_100(self):
        _make_index()
        results = fuzzy_search("flipkart")
        assert results, "Expected at least one result"
        assert results[0].score == 100.0
        assert results[0].display_name == "Flipkart"

    def test_known_alias_scores_100(self):
        _make_index()
        results = fuzzy_search("flipcart")
        assert results[0].score == 100.0
        assert results[0].display_name == "Flipkart"

    def test_typo_flipkrt_resolves_flipkart(self):
        _make_index()
        results = fuzzy_search("flpkrt")
        assert results, "Expected results for flpkrt"
        assert results[0].display_name == "Flipkart"
        assert results[0].score >= 80, f"Expected score >= 80, got {results[0].score}"

    def test_typo_swigy_resolves_swiggy(self):
        _make_index()
        results = fuzzy_search("swigy")
        assert results[0].display_name == "Swiggy"
        assert results[0].score >= 80

    def test_typo_zomoto_resolves_zomato(self):
        _make_index()
        results = fuzzy_search("zomoto")
        assert results[0].display_name == "Zomato"
        assert results[0].score >= 80

    def test_typo_amzon_resolves_amazon(self):
        _make_index()
        results = fuzzy_search("amzon")
        assert results[0].display_name == "Amazon"
        assert results[0].score >= 80

    def test_gibberish_returns_low_score(self):
        _make_index()
        results = fuzzy_search("xkqzwmvbnrst")
        top = get_top_score(results)
        assert top < 50, f"Gibberish should score < 50, got {top}"

    def test_empty_index_returns_empty(self):
        build_index([])
        results = fuzzy_search("flipkart")
        assert results == []

    def test_deduplication_by_merchant_id(self):
        """Multiple aliases for same merchant should produce only one result."""
        _make_index()
        results = fuzzy_search("flipkart", top_n=10)
        merchant_ids = [r.merchant_id for r in results]
        assert len(merchant_ids) == len(set(merchant_ids)), "Duplicate merchant_ids found"


class TestClassifyScore:
    def test_fuzzy_auto_above_95(self):
        assert classify_score(95) == "FUZZY_AUTO"
        assert classify_score(100) == "FUZZY_AUTO"
        assert classify_score(97) == "FUZZY_AUTO"

    def test_llm_recovery_80_to_94(self):
        assert classify_score(80) == "LLM_RECOVERY"
        assert classify_score(85) == "LLM_RECOVERY"
        assert classify_score(94) == "LLM_RECOVERY"

    def test_llm_discovery_50_to_79(self):
        assert classify_score(50) == "LLM_DISCOVERY"
        assert classify_score(60) == "LLM_DISCOVERY"
        assert classify_score(79) == "LLM_DISCOVERY"

    def test_unknown_below_50(self):
        assert classify_score(49) == "UNKNOWN"
        assert classify_score(0) == "UNKNOWN"
        assert classify_score(30) == "UNKNOWN"


class TestCommonTypos:
    """Parametric tests for common typos from the spec."""

    TYPO_CASES = [
        ("flipcart", "Flipkart", "FUZZY_AUTO"),   # alias match → should be 100
        ("flpkrt", "Flipkart", "LLM_RECOVERY"),   # fuzzy 80-94
        ("swigy", "Swiggy", "LLM_RECOVERY"),
        ("zomoto", "Zomato", "LLM_RECOVERY"),
        ("amzon", "Amazon", "LLM_RECOVERY"),
    ]

    @pytest.mark.parametrize("query,expected_merchant,expected_stage", TYPO_CASES)
    def test_typo_resolution(self, query, expected_merchant, expected_stage):
        _make_index()
        results = fuzzy_search(query)
        assert results, f"No results for query: {query!r}"
        top = results[0]
        assert top.display_name == expected_merchant, (
            f"Expected {expected_merchant!r} for {query!r}, got {top.display_name!r} (score={top.score})"
        )
        stage = classify_score(top.score)
        assert stage in (expected_stage, "FUZZY_AUTO"), (
            f"Expected stage {expected_stage!r} or FUZZY_AUTO for {query!r}, got {stage!r} (score={top.score})"
        )


# ---------------------------------------------------------------------------
# Cache Module Tests
# ---------------------------------------------------------------------------

class TestResolutionCache:
    def test_put_and_get_cacheable_type(self):
        put("flipcart", "id-1", "Flipkart", "ecommerce", "BRAND", 1.0, "ALIAS")
        result = get("flipcart")
        assert result is not None
        assert result.merchant_name == "Flipkart"
        assert result.resolution_type == "ALIAS"

    def test_unknown_not_cached(self):
        cached = put("xkqz", None, None, "unknown", "UNKNOWN", 0.0, "UNKNOWN")
        assert cached is False
        assert get("xkqz") is None

    def test_discovery_not_cached(self):
        cached = put("localdhaba", None, "Dhaba", "food", "LOCAL_BUSINESS", 0.91, "LLM_DISCOVERY")
        assert cached is False

    def test_all_cacheable_types(self):
        for res_type in ["ALIAS", "FUZZY_AUTO", "LLM_RECOVERY", "USER_CONFIRMED"]:
            key = f"test_{res_type.lower()}"
            cached = put(key, "some-id", "Merchant", "category", "BRAND", 0.9, res_type)
            assert cached is True, f"{res_type} should be cacheable"
            assert get(key) is not None

    def test_invalidate_removes_entry(self):
        put("flipcart", "id-1", "Flipkart", "ecommerce", "BRAND", 1.0, "ALIAS")
        assert get("flipcart") is not None
        invalidate("flipcart")
        assert get("flipcart") is None

    def test_stats(self):
        clear_all()
        put("a", "id-1", "A", "cat", "BRAND", 1.0, "ALIAS")
        put("b", "id-2", "B", "cat", "BRAND", 1.0, "FUZZY_AUTO")
        s = stats()
        assert s["active_entries"] == 2

    def test_cache_miss_returns_none(self):
        assert get("definitely-not-cached-key") is None
