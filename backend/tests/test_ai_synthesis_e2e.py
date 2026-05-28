"""
Module: backend.tests.test_ai_synthesis_e2e
Responsibility: End-to-end integration tests for the AI Narrative Synthesis Layer.

Tests the full pipeline:
  PortfolioEvolutionService → NarrativeSynthesizer → OpenAIClient (mocked)
  with real SQLite in-memory DB for PortfolioEvolutionSnapshot persistence.

Scenarios:
  1. Successful AI narrative generation
  2. Graceful fallback when AI fails (API error / disabled)
  3. Context hash deduplication — second identical call skips AI
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import AsyncIterator
from unittest.mock import patch

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from ai.client import openai_client
from behavioral_memory.models import (
    OverrideReason,
    RecommendationBehaviorRecord,
)
from cards.enums import OptimizationPersonality
from models.card_catalog import CardCatalog
from models.user_card import UserCard
from models.user import User
from portfolio_evolution.service import PortfolioEvolutionService

# ── Constants ────────────────────────────────────────────────────────────────

TEST_USER_ID = uuid.UUID("a0000001-0000-4000-8000-000000000001")
TEST_CARD_CATALOG_ID = uuid.UUID("b0000001-0000-4000-8000-000000000001")
TEST_USER_CARD_ID = uuid.UUID("c0000001-0000-4000-8000-000000000001")
TEST_TRANSACTION_ID = uuid.UUID("d0000001-0000-4000-8000-000000000001")

FAKE_AI_NARRATIVE = "Recent behavioral drift indicates an ongoing structural transition toward a leaner, more deliberate wallet configuration."


# ── Database Fixtures ────────────────────────────────────────────────────────


@pytest_asyncio.fixture(scope="function")
async def async_engine():
    """Create a new in-memory SQLite engine per test function.

    Only creates the tables needed for portfolio evolution tests (not
    all tables in SQLModel.metadata, because some models use
    PostgreSQL-specific types like JSONB that SQLite cannot render).
    """
    from portfolio_evolution.models import PortfolioEvolutionSnapshot

    engine = create_async_engine(
        "sqlite+aiosqlite://",
        echo=False,
        future=True,
    )

    # Register only the models this test file touches
    _test_tables = [
        User,
        CardCatalog,
        UserCard,
        RecommendationBehaviorRecord,
        PortfolioEvolutionSnapshot,
    ]
    # Collect a fresh MetaData with only these tables
    _test_metadata = SQLModel.metadata
    _test_metadata.clear()
    for model in _test_tables:
        _test_metadata._add_table(
            model.__tablename__, None, model.__table__
        )

    async with engine.begin() as conn:
        await conn.run_sync(_test_metadata.create_all)

    try:
        yield engine
    finally:
        await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(async_engine) -> AsyncIterator[AsyncSession]:
    """Provide a clean AsyncSession bound to the in-memory SQLite database."""
    session_factory = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with session_factory() as session:
        yield session


# ── Test Data Factories ──────────────────────────────────────────────────────


async def seed_user(db: AsyncSession) -> User:
    """Insert a minimal User row so UserCard relationships resolve."""
    user = User(
        id=TEST_USER_ID,
        email="test@example.com",
        hashed_password="hashed_abc123",
        full_name="Test User",
    )
    db.add(user)
    await db.flush()
    return user


async def seed_card_catalog(db: AsyncSession) -> CardCatalog:
    """Insert a minimal CardCatalog row so UserCard relationships resolve."""
    catalog = CardCatalog(
        id=TEST_CARD_CATALOG_ID,
        card_name="Test Visa Signature",
        bank_name="Test Bank",
        network="Visa",
        joining_fee=Decimal("0.00"),
        annual_fee=Decimal("499.00"),
    )
    db.add(catalog)
    await db.flush()
    return catalog


async def seed_user_card(db: AsyncSession) -> UserCard:
    """Insert a single ACTIVE UserCard linked to the seed catalog."""
    card = UserCard(
        id=TEST_USER_CARD_ID,
        user_id=TEST_USER_ID,
        card_catalog_id=TEST_CARD_CATALOG_ID,
        nickname="Daily Driver",
        credit_limit=Decimal("500000.00"),
        current_spend=Decimal("15000.00"),
        annual_spend=Decimal("500000.00"),
        billing_date=15,
        due_date=5,
        card_status="ACTIVE",
    )
    db.add(card)
    await db.flush()
    return card


async def seed_behavior(db: AsyncSession, was_followed: bool = True) -> RecommendationBehaviorRecord:
    """Insert a single behavior record (followed or overridden)."""
    behavior = RecommendationBehaviorRecord(
        user_id=TEST_USER_ID,
        transaction_id=TEST_TRANSACTION_ID,
        selected_card_id=TEST_USER_CARD_ID,
        personality_at_time=OptimizationPersonality.MAXIMIZE_REWARDS,
        was_followed=was_followed,
        override_reason=None if was_followed else OverrideReason.SIMPLIFYING_WALLET,
        override_delta_value=None if was_followed else Decimal("-50.00"),
    )
    db.add(behavior)
    await db.flush()
    return behavior


async def seed_full_portfolio(db: AsyncSession) -> tuple[UserCard, RecommendationBehaviorRecord]:
    """Seed all prerequisite data: user + catalog + card + behavior."""
    await seed_user(db)
    await seed_card_catalog(db)
    card = await seed_user_card(db)
    behavior = await seed_behavior(db, was_followed=True)
    return card, behavior


# ── Mock Helpers ─────────────────────────────────────────────────────────────


class MockOpenAIClientSynthesize:
    """
    Context manager that patches openai_client.synthesize with a controlled return value.
    Tracks call count via a mutable counter dict.
    """

    def __init__(self, narrative: str | None, call_counter: dict | None = None):
        self._narrative = narrative
        self._call_counter = call_counter or {"count": 0}

    async def _synthesize(self, system_prompt: str, user_message: str) -> str | None:
        self._call_counter["count"] += 1
        return self._narrative

    def __enter__(self):
        self._patcher = patch.object(
            openai_client,
            "synthesize",
            side_effect=self._synthesize,
        )
        self._patcher.start()
        return self._call_counter

    def __exit__(self, *args):
        self._patcher.stop()


# ── Scenario 1: Successful AI Narrative Generation ───────────────────────────


@pytest.mark.asyncio
async def test_scenario_1_successful_ai_narrative_generation(db_session: AsyncSession):
    """
    Scenario 1: Successful AI Narrative Generation

    Mock the OpenAI client to return a fake narrative.
    Call generate_snapshot and assert:
      - ai_narrative matches the mocked text.
      - narrative_context_hash is generated.
      - narrative_context_json contains the semantic state.
      - primary_narrative is still populated (deterministic fallback intact).
    """
    # Arrange: seed prerequisite data
    await seed_full_portfolio(db_session)

    # Mock the OpenAI synthesize call to return our controlled narrative
    call_counter = {"count": 0}

    with MockOpenAIClientSynthesize(FAKE_AI_NARRATIVE, call_counter):
        # Act
        snapshot = await PortfolioEvolutionService.generate_snapshot(
            TEST_USER_ID, db_session
        )

    # Assert: AI narrative populated
    assert snapshot.ai_narrative == FAKE_AI_NARRATIVE, (
        f"Expected ai_narrative='{FAKE_AI_NARRATIVE}', got='{snapshot.ai_narrative}'"
    )
    assert call_counter["count"] == 1, (
        f"OpenAI synthesize should be called exactly once, called {call_counter['count']} times"
    )

    # Assert: auditability metadata present
    assert snapshot.narrative_context_hash is not None, (
        "narrative_context_hash should be generated"
    )
    assert len(snapshot.narrative_context_hash) == 64, (
        "narrative_context_hash should be a 64-char SHA-256 hex digest"
    )
    assert snapshot.narrative_context_json is not None, (
        "narrative_context_json should contain the semantic state"
    )
    assert isinstance(snapshot.narrative_context_json, dict), (
        "narrative_context_json should be a dict"
    )
    assert "portfolio_direction" in snapshot.narrative_context_json, (
        "context JSON should include portfolio_direction"
    )

    # Assert: generated_at timestamp is set
    assert snapshot.narrative_generated_at is not None, (
        "narrative_generated_at should be set"
    )
    assert isinstance(snapshot.narrative_generated_at, datetime), (
        "narrative_generated_at should be a datetime"
    )

    # Assert: model, prompt version, and generation reason tracked
    assert snapshot.narrative_model is not None, "narrative_model should be set"
    assert snapshot.narrative_prompt_version == "1.0.0", (
        "narrative_prompt_version should match synthesizer PROMPT_VERSION"
    )
    assert snapshot.narrative_generation_reason == "initial_generation", (
        "first snapshot should have reason='initial_generation'"
    )

    # Assert: deterministic primary_narrative is still populated
    assert snapshot.primary_narrative is not None, (
        "primary_narrative (deterministic fallback) must still be populated"
    )
    assert len(snapshot.primary_narrative) > 0, (
        "primary_narrative should not be empty"
    )

    # Assert: deterministic metrics are computed
    assert snapshot.complexity_score > 0.0, "complexity_score should be > 0"
    assert snapshot.redundancy_score >= 0.0, "redundancy_score should be computed"
    assert snapshot.value_density >= 0.0, "value_density should be computed"

    # Assert: structured narrative primitives present
    assert isinstance(snapshot.strategy_reflections, list), (
        "strategy_reflections should be a list"
    )
    assert isinstance(snapshot.topology_insights, list), (
        "topology_insights should be a list"
    )
    assert isinstance(snapshot.evolution_observations, list), (
        "evolution_observations should be a list"
    )


# ── Scenario 2: Graceful Fallback (OpenAI Failure) ───────────────────────────


@pytest.mark.asyncio
async def test_scenario_2_graceful_fallback_on_api_failure(db_session: AsyncSession):
    """
    Scenario 2: Graceful Fallback — OpenAI client raises an Exception.

    Mock the OpenAI synthesize call to return None (simulating API failure).
    Assert:
      - ai_narrative is None.
      - narrative_context_hash is None.
      - primary_narrative is successfully populated (app didn't crash).
    """
    # Arrange
    await seed_full_portfolio(db_session)

    # Mock synthesize to return None (API failure path)
    call_counter = {"count": 0}

    with MockOpenAIClientSynthesize(None, call_counter):
        # Act
        snapshot = await PortfolioEvolutionService.generate_snapshot(
            TEST_USER_ID, db_session
        )

    # Assert: AI fields remain unset — graceful degradation
    assert snapshot.ai_narrative is None, (
        "ai_narrative should be None when AI synthesis returns None"
    )
    assert snapshot.narrative_context_hash is None, (
        "narrative_context_hash should be None when AI returns None"
    )
    assert snapshot.narrative_context_json is None, (
        "narrative_context_json should be None when AI returns None"
    )
    assert snapshot.narrative_generated_at is None, (
        "narrative_generated_at should be None when AI returns None"
    )
    assert call_counter["count"] == 1, (
        "OpenAI synthesize should be called (and return None)"
    )

    # Assert: system did not crash — deterministic narrative is intact
    assert snapshot.primary_narrative is not None, (
        "primary_narrative MUST be populated even when AI fails"
    )
    assert len(snapshot.primary_narrative) > 0, (
        "primary_narrative should contain a valid fallback string"
    )
    assert snapshot.complexity_score > 0.0, (
        "complexity_score should still be computed"
    )
    assert snapshot.redundancy_score >= 0.0, (
        "redundancy_score should still be computed"
    )


# ── Scenario 3: Context Hash Deduplication ───────────────────────────────────


@pytest.mark.asyncio
async def test_scenario_3_context_hash_deduplication(db_session: AsyncSession):
    """
    Scenario 3: Context Hash Deduplication

    Call generate_snapshot twice with the same portfolio state.
    - First call: triggers AI (OpenAI mock called once).
    - Second call: skips AI because context hash matches existing snapshot.
    Assert the OpenAI mock was called exactly once across both calls.
    """
    # Arrange: seed data
    await seed_full_portfolio(db_session)

    call_counter = {"count": 0}

    with MockOpenAIClientSynthesize(FAKE_AI_NARRATIVE, call_counter):
        # Act — First call: should trigger AI
        snapshot_1 = await PortfolioEvolutionService.generate_snapshot(
            TEST_USER_ID, db_session
        )

        # Act — Second call: same portfolio state → hash matches → skip AI
        snapshot_2 = await PortfolioEvolutionService.generate_snapshot(
            TEST_USER_ID, db_session
        )

    # Assert: OpenAI was called exactly once (first call only)
    assert call_counter["count"] == 1, (
        f"OpenAI should be called exactly once across both snapshots, "
        f"but was called {call_counter['count']} times — "
        f"deduplication failed"
    )

    # Assert: both snapshots refer to the same DB row (upsert by user+date)
    assert snapshot_1.id == snapshot_2.id, (
        "Second call should update the same snapshot row (upsert)"
    )

    # Assert: ai_narrative from the first call persists on the row
    # (synthesizer returned None on second call, so ai_narrative was not overwritten)
    assert snapshot_1.ai_narrative == FAKE_AI_NARRATIVE, (
        "First snapshot should have the AI narrative"
    )
    assert snapshot_2.ai_narrative == FAKE_AI_NARRATIVE, (
        "Second snapshot should retain the AI narrative from the first call — "
        "the same DB row was upserted and ai_narrative was not cleared"
    )

    # Assert: both snapshots have the same context hash
    assert snapshot_1.narrative_context_hash == snapshot_2.narrative_context_hash, (
        "Both snapshots should share the same context hash since state is identical"
    )

    # Assert: deterministic narratives are present in both
    assert snapshot_1.primary_narrative is not None, (
        "First snapshot primary_narrative should be populated"
    )
    assert snapshot_2.primary_narrative is not None, (
        "Second snapshot primary_narrative should be populated"
    )

    # Assert: snapshot_1 generation reason is initial, snapshot_2 has no generation
    assert snapshot_1.narrative_generation_reason == "initial_generation"
    assert snapshot_2.narrative_generation_reason == "initial_generation", (
        "Upsert reuses the same DB row, so generation_reason from first call persists"
    )
