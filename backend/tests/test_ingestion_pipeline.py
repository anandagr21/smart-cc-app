"""
Module: backend.tests.test_ingestion_pipeline
Responsibility: Integration tests for the 4-agent Credit Card Ingestion Pipeline.

Tests all six required scenarios:
  1. Discovery Agent — extract a known credit card
  2. Mapper Agent — insert a card into CardCatalog
  3. Validation Agent — detect intentionally corrupted data (FAIL)
  4. Fix Agent — correct the corrupted data
  5. Validation Agent (re-run) — confirm fix (PASS)
  6. End-to-end correction loop — bad data → validator → fixer → validator → PASS

Uses in-memory SQLite (via aiosqlite) for fast, isolated database tests.
All external dependencies (LLM, search) are mocked for determinism.
"""

import os
import uuid
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel import SQLModel
from langchain_core.runnables import RunnableLambda

from agents.ingestion_pipeline.state import IngestionState
from agents.ingestion_pipeline.agent1_discovery import (
    DiscoveryOutput,
    DiscoveredCard,
    run_discovery_agent,
)
from agents.ingestion_pipeline.agent2_mapper import (
    MapperOutput,
    MappedRewardRule,
    MappedMilestone,
    run_mapper_agent,
)
from agents.ingestion_pipeline.agent3_validation import (
    ValidatorOutput,
    ValidatorFailureOutput,
    run_validation_agent,
)
from agents.ingestion_pipeline.agent4_fix import (
    FixerOutput,
    FixUpdate,
    run_fix_agent,
)
from agents.ingestion_pipeline.graph import create_ingestion_graph
from models.card_catalog import CardCatalog
from models.user import User
from models.user_card import UserCard

pytestmark = pytest.mark.asyncio

# ── Constants ────────────────────────────────────────────────────────────────

TEST_CARD_NAME = "HDFC Millennia"
TEST_BANK_NAME = "HDFC Bank"
TEST_NETWORK = "Visa"


# ── Mock Helpers ──────────────────────────────────────────────────────────────


def _make_mock_chain(result):
    """Create a LangChain-compatible mock that returns `result` when ainvoke() is called.

    Uses RunnableLambda so that `prompt | mock_llm` works correctly with LangChain's
    coerce_to_runnable (which rejects plain MagicMock objects).
    """
    async def _ainvoke(_input, config=None):
        return result

    def _invoke(_input, config=None):
        return result

    runnable = RunnableLambda(_ainvoke)
    # Also attach a synchronous invoke for compatibility
    runnable.invoke = _invoke  # type: ignore[attr-defined]
    return runnable


class MockSearchProvider:
    """Mock search provider with controlled responses."""

    def __init__(self, response: str = ""):
        self._response = response

    def search(self, query: str) -> str:
        return self._response


# ── Pydantic Model Factories ─────────────────────────────────────────────────


def _discovery_output(card_name: str = TEST_CARD_NAME) -> DiscoveryOutput:
    """Build a DiscoveryOutput with one valid test card."""
    return DiscoveryOutput(
        cards=[
            DiscoveredCard(
                card_name=card_name,
                issuer=TEST_BANK_NAME,
                network=TEST_NETWORK,
                joining_fee=500.0,
                annual_fee=500.0,
                fee_waiver_criteria="Spend ₹1,00,000 annually to waive annual fee",
                reward_details="5% cashback on Amazon, Flipkart; 1% on other spends",
                cashback_details="5% cashback on select merchants",
                milestone_benefits="₹1,000 voucher on spending ₹1,00,000 quarterly",
                lounge_benefits="8 domestic lounge visits per year",
                fuel_benefits="1% fuel surcharge waiver",
                exclusions="No cashback on fuel, gold, wallet loads",
                welcome_benefits="₹1,000 cashback on first transaction",
                source_urls=[
                    "https://www.hdfcbank.com/millennia-card",
                    "https://www.hdfcbank.com/millennia-card/mitc.pdf",
                ],
            )
        ]
    )


def _mapper_output(
    card_name: str = TEST_CARD_NAME,
    bank_name: str = TEST_BANK_NAME,
    validation_required: bool = False,
) -> MapperOutput:
    """Build a MapperOutput with well-structured reward rules and milestones."""
    return MapperOutput(
        card_name=card_name,
        bank_name=bank_name,
        network=TEST_NETWORK,
        joining_fee=500.0,
        annual_fee=500.0,
        fee_waiver_spend_threshold=100000.0,
        reward_rules=[
            MappedRewardRule(
                category_name="Amazon",
                multiplier=5.0,
                reward_type="cashback",
                has_cap=True,
                cap_limit=1000.0,
                merchant_exclusions=[],
            ),
            MappedRewardRule(
                category_name="Flipkart",
                multiplier=5.0,
                reward_type="cashback",
                has_cap=True,
                cap_limit=1000.0,
                merchant_exclusions=[],
            ),
            MappedRewardRule(
                category_name="Other",
                multiplier=1.0,
                reward_type="cashback",
                has_cap=False,
                merchant_exclusions=["fuel", "gold", "wallet"],
            ),
        ],
        milestones=[
            MappedMilestone(
                spend_target=100000.0,
                reward_payout="₹1,000 voucher",
                cycle="quarterly",
            )
        ],
        validation_required=validation_required,
    )


def _validator_output_passed() -> ValidatorOutput:
    """Build a ValidatorOutput with PASSED status."""
    return ValidatorOutput(
        status="PASSED",
        confidence=95.0,
        failures=[],
        sources=[
            "https://www.hdfcbank.com/millennia-card",
            "https://www.hdfcbank.com/millennia-card/mitc.pdf",
        ],
    )


def _validator_output_failed() -> ValidatorOutput:
    """Build a ValidatorOutput with FAILED status — annual fee mismatch."""
    return ValidatorOutput(
        status="FAILED",
        confidence=85.0,
        failures=[
            ValidatorFailureOutput(
                field="Annual Fee",
                expected="₹500",
                found="₹999999",
                reason="Annual fee on official website is ₹500, but database has ₹999999",
            ),
            ValidatorFailureOutput(
                field="Reward Structure",
                expected="5% cashback",
                found="50% cashback",
                reason="Reward rate on official website is 5%, but database has 50%",
            ),
        ],
        sources=["https://www.hdfcbank.com/millennia-card"],
    )


def _fixer_output() -> FixerOutput:
    """Build a FixerOutput that corrects annual fee and reward rules."""
    return FixerOutput(
        fixed=True,
        changes=[
            FixUpdate(
                field="annual_fee",
                old="999999",
                new=500.0,
                source="https://www.hdfcbank.com/millennia-card",
                timestamp="2026-06-23T00:00:00Z",
            ),
            FixUpdate(
                field="reward_rules",
                old="multiplier: 50.0",
                new="multiplier: 5.0",
                source="https://www.hdfcbank.com/millennia-card",
                timestamp="2026-06-23T00:00:00Z",
            ),
        ],
        updated_annual_fee=500.0,
        updated_reward_rules=[
            {
                "category_name": "Amazon",
                "multiplier": 5.0,
                "reward_type": "cashback",
                "has_cap": True,
                "cap_limit": 1000.0,
                "merchant_exclusions": [],
            }
        ],
    )


# ── Database Fixtures ────────────────────────────────────────────────────────


@pytest_asyncio.fixture(scope="function")
async def test_engine():
    """Create an in-memory SQLite engine for isolated ingestion pipeline tests.

    Only registers the CardCatalog table (not all tables in SQLModel.metadata,
    because some models use PostgreSQL-specific types like JSONB).
    """
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        echo=False,
        future=True,
    )

    # Register tables needed for these tests.
    # User and UserCard are needed because CardCatalog has a relationship to UserCard
    # which SQLAlchemy tries to resolve during refresh/relationship loading.
    _test_metadata = SQLModel.metadata
    _test_metadata.clear()
    for model in [User, UserCard, CardCatalog]:
        _test_metadata._add_table(
            model.__tablename__, None, model.__table__  # type: ignore[attr-defined]
        )

    async with engine.begin() as conn:
        await conn.run_sync(_test_metadata.create_all)

    try:
        yield engine
    finally:
        await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def test_session_factory(test_engine):
    """Provide an async_sessionmaker bound to the in-memory SQLite engine.

    This sessionmaker can be patched in place of async_session_factory
    so agents use the test database instead of the real one.
    """
    return async_sessionmaker(
        test_engine,
        expire_on_commit=False,
    )


# ── Patch Helpers ────────────────────────────────────────────────────────────


def _patch_db(agent_module: str, test_session_factory):
    """Patch async_session_factory in the given agent module to use test DB.

    Replaces the module-level `async_session_factory` with the test sessionmaker,
    so agents create sessions against the in-memory SQLite database.
    """
    return patch(
        f"agents.ingestion_pipeline.{agent_module}.async_session_factory",
        test_session_factory,
    )


# ── Test 1: Discovery Agent ──────────────────────────────────────────────────


async def test_1_discovery_agent():
    """Test 1: Discover and extract one known credit card.

    Mocks the LLM to return a controlled DiscoveryOutput with one card.
    Asserts the discovered_cards state is populated correctly.
    """
    fake_output = _discovery_output()

    with patch(
        "agents.ingestion_pipeline.agent1_discovery.get_llm",
        return_value=_make_mock_chain(fake_output),
    ), patch(
        "agents.ingestion_pipeline.agent1_discovery.get_search_provider",
        return_value=MockSearchProvider("HDFC Millennia credit card details..."),
    ):
        state: IngestionState = {
            "existing_card_names": ["Some Random Card"],
            "discovered_cards": [],
            "inserted_cards": [],
            "validation_reports": {},
            "cards_to_fix": [],
            "fix_retries": {},
        }

        result = await run_discovery_agent(state)

    discovered = result["discovered_cards"]
    assert len(discovered) == 1, f"Expected 1 discovered card, got {len(discovered)}"
    card = discovered[0]
    assert card["card_name"] == TEST_CARD_NAME
    assert card["issuer"] == TEST_BANK_NAME
    assert card["network"] == TEST_NETWORK
    assert card["joining_fee"] == 500.0
    assert card["annual_fee"] == 500.0
    assert "1,00,000" in card["fee_waiver_criteria"]
    assert len(card["source_urls"]) >= 1


# ── Test 2: Mapper Agent ─────────────────────────────────────────────────────


async def test_2_mapper_inserts_to_catalog(test_session_factory):
    """Test 2: Insert one card into CardCatalog via the Mapper Agent.

    Mocks the LLM to return a controlled MapperOutput.
    Verifies the record is created in the database with correct fields.
    """
    unique_card_name = f"Test Card {uuid.uuid4().hex[:8]}"
    fake_output = _mapper_output(card_name=unique_card_name)

    with patch(
        "agents.ingestion_pipeline.agent2_mapper.get_llm",
        return_value=_make_mock_chain(fake_output),
    ), _patch_db("agent2_mapper", test_session_factory):
        state: IngestionState = {
            "existing_card_names": [],
            "discovered_cards": [
                {
                    "card_name": unique_card_name,
                    "issuer": TEST_BANK_NAME,
                    "network": TEST_NETWORK,
                    "joining_fee": 500,
                    "annual_fee": 500,
                    "source_urls": ["https://example.com/card"],
                }
            ],
            "inserted_cards": [],
            "validation_reports": {},
            "cards_to_fix": [],
            "fix_retries": {},
        }

        result = await run_mapper_agent(state)

    assert len(result["inserted_cards"]) == 1, (
        f"Expected 1 inserted card, got {len(result['inserted_cards'])}"
    )

    card_id_str = result["inserted_cards"][0]["card_id"]
    card_id = uuid.UUID(card_id_str)

    # Verify in DB
    async with test_session_factory() as session:
        from sqlalchemy import select

        stmt = select(CardCatalog).where(CardCatalog.id == card_id)
        db_result = await session.execute(stmt)
        db_card = db_result.scalars().first()

        assert db_card is not None, "Card not found in database"
        assert db_card.card_name == unique_card_name
        assert db_card.bank_name == TEST_BANK_NAME
        assert db_card.network == TEST_NETWORK
        assert float(db_card.joining_fee) == 500.0
        assert float(db_card.annual_fee) == 500.0
        assert float(db_card.fee_waiver_spend_threshold) == 100000.0

        # Verify reward_rules_json was stored
        assert db_card.reward_rules_json is not None
        assert "rules" in db_card.reward_rules_json
        assert len(db_card.reward_rules_json["rules"]) == 3

        # Verify milestones_json was stored
        assert db_card.milestones_json is not None
        assert "milestones" in db_card.milestones_json
        assert len(db_card.milestones_json["milestones"]) == 1

        # Verify default values for existing fields
        assert db_card.is_active is True  # default — mapper does not override
        assert db_card.is_approved is False  # default — mapper does NOT set to True


# ── Test 3: Validation Agent — Detects Bad Data ──────────────────────────────


async def test_3_validation_detects_bad_data(test_session_factory):
    """Test 3: Manually insert incorrect data, run Validator, expect FAILED report.

    Inserts a card with annual_fee=999999 and reward multiplier=50.0.
    Mock the validator LLM to return FAILED with specific discrepancies.
    """
    # Insert a bad card directly
    unique_card_name = f"Bad Card {uuid.uuid4().hex[:8]}"
    bad_card = CardCatalog(
        card_name=unique_card_name,
        bank_name=TEST_BANK_NAME,
        network=TEST_NETWORK,
        annual_fee=Decimal("999999"),  # intentionally bad
        joining_fee=Decimal("0"),
        fee_waiver_spend_threshold=None,
        reward_rules_json={
            "rules": [
                {
                    "category_name": "All",
                    "multiplier": 50.0,  # intentionally bad
                    "reward_type": "cashback",
                    "has_cap": False,
                }
            ]
        },
        milestones_json={},
    )

    async with test_session_factory() as session:
        session.add(bad_card)
        await session.commit()
        await session.refresh(bad_card)

    card_id_str = str(bad_card.id)

    with patch(
        "agents.ingestion_pipeline.agent3_validation.get_llm",
        return_value=_make_mock_chain(_validator_output_failed()),
    ), patch(
        "agents.ingestion_pipeline.agent3_validation.get_search_provider",
        return_value=MockSearchProvider("Annual fee ₹500, 5% cashback..."),
    ), _patch_db("agent3_validation", test_session_factory):
        state: IngestionState = {
            "existing_card_names": [],
            "discovered_cards": [],
            "inserted_cards": [{"card_id": card_id_str}],
            "validation_reports": {},
            "cards_to_fix": [],
            "fix_retries": {},
        }

        result = await run_validation_agent(state)

    # Assert validation report exists
    assert card_id_str in result["validation_reports"]
    report = result["validation_reports"][card_id_str]
    assert report["status"] == "FAILED", (
        f"Expected FAILED status, got {report['status']}"
    )
    assert len(report["failures"]) == 2
    assert report["confidence"] >= 80.0

    # Assert card is in cards_to_fix
    assert card_id_str in result["cards_to_fix"], (
        "Failed card should be in cards_to_fix"
    )

    # Assert markdown report was written
    report_path = os.path.join(
        os.getcwd(), "reports", f"card_validation_{card_id_str}.md"
    )
    assert os.path.exists(report_path), f"Report not found at {report_path}"
    with open(report_path) as f:
        content = f.read()
        assert "FAILED" in content
        assert "Annual Fee" in content
        assert "999999" in content

    # Cleanup
    os.remove(report_path)


# ── Test 4: Fix Agent — Corrects Bad Data ────────────────────────────────────


async def test_4_fix_agent_corrects_data(test_session_factory):
    """Test 4: Run the Fix Agent on a failed card and verify DB is corrected."""
    unique_card_name = f"Fixable Card {uuid.uuid4().hex[:8]}"
    bad_card = CardCatalog(
        card_name=unique_card_name,
        bank_name=TEST_BANK_NAME,
        network=TEST_NETWORK,
        annual_fee=Decimal("999999"),  # intentionally bad
        joining_fee=Decimal("0"),
    )

    async with test_session_factory() as session:
        session.add(bad_card)
        await session.commit()
        await session.refresh(bad_card)
        card_id_str = str(bad_card.id)

    with patch(
        "agents.ingestion_pipeline.agent4_fix.get_llm",
        return_value=_make_mock_chain(_fixer_output()),
    ), patch(
        "agents.ingestion_pipeline.agent4_fix.get_search_provider",
        return_value=MockSearchProvider("Annual fee ₹500..."),
    ), _patch_db("agent4_fix", test_session_factory):
        state: IngestionState = {
            "existing_card_names": [],
            "discovered_cards": [],
            "inserted_cards": [{"card_id": card_id_str}],
            "validation_reports": {
                card_id_str: {
                    "status": "FAILED",
                    "failures": [
                        {
                            "field": "Annual Fee",
                            "expected": "₹500",
                            "found": "₹999999",
                            "reason": "Mismatch",
                        },
                        {
                            "field": "Reward Structure",
                            "expected": "5% cashback",
                            "found": "50% cashback",
                            "reason": "Mismatch",
                        },
                    ],
                    "markdown_content": "",
                    "confidence": 85.0,
                }
            },
            "cards_to_fix": [card_id_str],
            "fix_retries": {},
        }

        result = await run_fix_agent(state)

    # Assert retry count incremented
    assert result["fix_retries"][card_id_str] == 1

    # Verify DB was updated
    async with test_session_factory() as session:
        from sqlalchemy import select

        stmt = select(CardCatalog).where(CardCatalog.id == uuid.UUID(card_id_str))
        db_result = await session.execute(stmt)
        db_card = db_result.scalars().first()

        assert db_card is not None
        assert float(db_card.annual_fee) == 500.0, (
            f"Expected annual_fee=500.0, got {db_card.annual_fee}"
        )
        # Reward rules should have been updated
        assert db_card.reward_rules_json is not None
        assert len(db_card.reward_rules_json.get("rules", [])) == 1


# ── Test 5: Re-Validation After Fix ──────────────────────────────────────────


async def test_5_revalidation_after_fix_passes(test_session_factory):
    """Test 5: After fixing, run Validator again and expect PASSED."""
    unique_card_name = f"Good Card {uuid.uuid4().hex[:8]}"
    good_card = CardCatalog(
        card_name=unique_card_name,
        bank_name=TEST_BANK_NAME,
        network=TEST_NETWORK,
        annual_fee=Decimal("500"),
        joining_fee=Decimal("500"),
    )

    async with test_session_factory() as session:
        session.add(good_card)
        await session.commit()
        await session.refresh(good_card)
        card_id_str = str(good_card.id)

    with patch(
        "agents.ingestion_pipeline.agent3_validation.get_llm",
        return_value=_make_mock_chain(_validator_output_passed()),
    ), patch(
        "agents.ingestion_pipeline.agent3_validation.get_search_provider",
        return_value=MockSearchProvider("Annual fee ₹500..."),
    ), _patch_db("agent3_validation", test_session_factory):
        state: IngestionState = {
            "existing_card_names": [],
            "discovered_cards": [],
            "inserted_cards": [{"card_id": card_id_str}],
            "validation_reports": {},
            "cards_to_fix": [card_id_str],  # was previously failing
            "fix_retries": {card_id_str: 1},
        }

        result = await run_validation_agent(state)

    # Assert validation passed
    assert card_id_str in result["validation_reports"]
    report = result["validation_reports"][card_id_str]
    assert report["status"] == "PASSED", (
        f"Expected PASSED status, got {report['status']}"
    )
    assert len(report["failures"]) == 0

    # Assert card is REMOVED from cards_to_fix
    if result["cards_to_fix"]:
        assert card_id_str not in result["cards_to_fix"], (
            "Passed card should NOT be in cards_to_fix"
        )

    # Assert markdown report was written
    report_path = os.path.join(
        os.getcwd(), "reports", f"card_validation_{card_id_str}.md"
    )
    assert os.path.exists(report_path)
    with open(report_path) as f:
        content = f.read()
        assert "PASSED" in content
        assert "All fields verified successfully" in content

    # Cleanup
    os.remove(report_path)


# ── Test 6: End-to-End Correction Loop ───────────────────────────────────────


async def test_6_end_to_end_correction_loop(test_session_factory):
    """Test 6: Insert intentionally incorrect data, run full Validator → Fixer → Validator loop.

    Verifies the complete correction loop:
      1. Insert card with annual_fee=999999 and reward_rate=50%
      2. Run Validator → FAILED
      3. Run Fixer → DB updated
      4. Run Validator → PASSED
      5. Markdown report updated accordingly
    """
    unique_card_name = f"E2E Card {uuid.uuid4().hex[:8]}"
    bad_card = CardCatalog(
        card_name=unique_card_name,
        bank_name=TEST_BANK_NAME,
        network=TEST_NETWORK,
        annual_fee=Decimal("999999"),  # intentionally bad
        joining_fee=Decimal("0"),
        reward_rules_json={
            "rules": [
                {
                    "category_name": "All",
                    "multiplier": 50.0,  # intentionally bad (50% cashback)
                    "reward_type": "cashback",
                    "has_cap": False,
                }
            ]
        },
    )

    async with test_session_factory() as session:
        session.add(bad_card)
        await session.commit()
        await session.refresh(bad_card)
        card_id_str = str(bad_card.id)

    # ── Step 1: Run Validator ──
    with patch(
        "agents.ingestion_pipeline.agent3_validation.get_llm",
        return_value=_make_mock_chain(_validator_output_failed()),
    ), patch(
        "agents.ingestion_pipeline.agent3_validation.get_search_provider",
        return_value=MockSearchProvider("Annual fee ₹500, 5% cashback..."),
    ), _patch_db("agent3_validation", test_session_factory):
        state: IngestionState = {
            "existing_card_names": [],
            "discovered_cards": [],
            "inserted_cards": [{"card_id": card_id_str}],
            "validation_reports": {},
            "cards_to_fix": [],
            "fix_retries": {},
        }

        result = await run_validation_agent(state)
        # Merge partial state returned by agent (only LangGraph auto-merges)
        state = {**state, **result}  # type: ignore[misc]

    # Assert first validation FAILED
    assert state["validation_reports"][card_id_str]["status"] == "FAILED"
    assert card_id_str in state["cards_to_fix"]

    first_report_path = os.path.join(
        os.getcwd(), "reports", f"card_validation_{card_id_str}.md"
    )
    assert os.path.exists(first_report_path)
    with open(first_report_path) as f:
        assert "FAILED" in f.read()

    # ── Step 2: Run Fixer ──
    with patch(
        "agents.ingestion_pipeline.agent4_fix.get_llm",
        return_value=_make_mock_chain(_fixer_output()),
    ), patch(
        "agents.ingestion_pipeline.agent4_fix.get_search_provider",
        return_value=MockSearchProvider("Annual fee ₹500..."),
    ), _patch_db("agent4_fix", test_session_factory):
        result = await run_fix_agent(state)
        state = {**state, **result}  # type: ignore[misc]

    # Assert retry count
    assert state["fix_retries"][card_id_str] == 1

    # Verify DB was actually corrected
    async with test_session_factory() as session:
        from sqlalchemy import select

        stmt = select(CardCatalog).where(CardCatalog.id == uuid.UUID(card_id_str))
        db_result = await session.execute(stmt)
        db_card = db_result.scalars().first()
        assert float(db_card.annual_fee) == 500.0, "DB annual_fee was not corrected"
        assert db_card.reward_rules_json is not None

    # ── Step 3: Run Validator again ──
    with patch(
        "agents.ingestion_pipeline.agent3_validation.get_llm",
        return_value=_make_mock_chain(_validator_output_passed()),
    ), patch(
        "agents.ingestion_pipeline.agent3_validation.get_search_provider",
        return_value=MockSearchProvider("Annual fee ₹500..."),
    ), _patch_db("agent3_validation", test_session_factory):
        result = await run_validation_agent(state)
        state = {**state, **result}  # type: ignore[misc]

    # Assert second validation PASSED
    assert state["validation_reports"][card_id_str]["status"] == "PASSED"
    assert len(state["validation_reports"][card_id_str]["failures"]) == 0
    assert card_id_str not in state["cards_to_fix"], (
        "Passed card should be removed from cards_to_fix"
    )

    # Assert markdown report was updated
    assert os.path.exists(first_report_path)
    with open(first_report_path) as f:
        content = f.read()
        assert "PASSED" in content
        assert "All fields verified successfully" in content

    # Cleanup
    os.remove(first_report_path)


# ── Test: Graph Orchestration Structure ───────────────────────────────────────


async def test_graph_structure():
    """Verify the LangGraph has all 4 agent nodes and correct edge structure."""
    graph = create_ingestion_graph()

    # The compiled graph should have all 4 agent nodes
    nodes = graph.get_graph().nodes
    node_names = {n for n in nodes if n in {"discovery", "mapper", "validation", "fix"}}
    assert node_names == {"discovery", "mapper", "validation", "fix"}, (
        f"Expected all 4 agent nodes, got {node_names}"
    )


# ── Test: Max Retries Enforced ───────────────────────────────────────────────


async def test_max_retries_enforced(test_session_factory):
    """Verify that cards with 3 failed fix attempts are not retried again."""
    unique_card_name = f"MaxRetries Card {uuid.uuid4().hex[:8]}"
    bad_card = CardCatalog(
        card_name=unique_card_name,
        bank_name=TEST_BANK_NAME,
        network=TEST_NETWORK,
        annual_fee=Decimal("999999"),
    )

    async with test_session_factory() as session:
        session.add(bad_card)
        await session.commit()
        await session.refresh(bad_card)
        card_id_str = str(bad_card.id)

    # Card already has 3 retries — fix agent should skip it
    # Also mock search and LLM since fix agent calls them before checking retries count
    with patch(
        "agents.ingestion_pipeline.agent4_fix.get_search_provider",
        return_value=MockSearchProvider("Annual fee ₹500..."),
    ), patch(
        "agents.ingestion_pipeline.agent4_fix.get_llm",
        return_value=_make_mock_chain(_fixer_output()),
    ), _patch_db("agent4_fix", test_session_factory):
        state: IngestionState = {
            "existing_card_names": [],
            "discovered_cards": [],
            "inserted_cards": [{"card_id": card_id_str}],
            "validation_reports": {
                card_id_str: {
                    "status": "FAILED",
                    "failures": [
                        {
                            "field": "Annual Fee",
                            "expected": "₹500",
                            "found": "₹999999",
                            "reason": "Mismatch",
                        }
                    ],
                    "markdown_content": "",
                    "confidence": 85.0,
                }
            },
            "cards_to_fix": [card_id_str],
            "fix_retries": {card_id_str: 3},  # already at max
        }

        result = await run_fix_agent(state)

    # Retry count should remain at 3 (not incremented further)
    assert result["fix_retries"][card_id_str] == 3, (
        "Card at max retries should not be retried"
    )


# ── Test: Mapper Sets validation_required When Uncertain ─────────────────────


async def test_mapper_sets_validation_required_when_uncertain(test_session_factory):
    """Verify mapper stores validation_required=True when reward info is ambiguous."""
    unique_card_name = f"Ambiguous Card {uuid.uuid4().hex[:8]}"

    fake_output = _mapper_output(
        card_name=unique_card_name,
        validation_required=True,  # mapper is uncertain about rewards
    )

    with patch(
        "agents.ingestion_pipeline.agent2_mapper.get_llm",
        return_value=_make_mock_chain(fake_output),
    ), _patch_db("agent2_mapper", test_session_factory):
        state: IngestionState = {
            "existing_card_names": [],
            "discovered_cards": [
                {
                    "card_name": unique_card_name,
                    "issuer": TEST_BANK_NAME,
                    "network": TEST_NETWORK,
                    "joining_fee": 500,
                    "annual_fee": 500,
                    "source_urls": [],
                }
            ],
            "inserted_cards": [],
            "validation_reports": {},
            "cards_to_fix": [],
            "fix_retries": {},
        }

        result = await run_mapper_agent(state)

    assert len(result["inserted_cards"]) == 1
    card_id_str = result["inserted_cards"][0]["card_id"]

    # Verify validation_required stored in reward_rules_json
    async with test_session_factory() as session:
        from sqlalchemy import select

        stmt = select(CardCatalog).where(CardCatalog.id == uuid.UUID(card_id_str))
        db_result = await session.execute(stmt)
        db_card = db_result.scalars().first()
        assert db_card.reward_rules_json.get("validation_required") is True, (
            "validation_required should be stored in reward_rules_json"
        )
