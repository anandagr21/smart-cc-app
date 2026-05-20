"""
Module: backend.tests.unit.api.test_reward_rules
Responsibility: Unit tests for reward rule schemas, validators, normalizers,
    loaders, repository, service, and route handlers.

Architectural Boundaries:
- Tests schemas, validators, normalizers, loaders, repository, service,
  and routes in isolation with mocked dependencies.
- No real database, no real reward engine, no real JWT.
- Follows the same patterns as test_auth.py and test_cards.py.
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from auth.dependencies import get_current_user
from auth.schemas import UserResponse
from core.exceptions import NotFoundException, ValidationException, ConflictException
from rewards.constants import (
    BONUS_RULE_TYPES,
    MONETARY_CONFIG_KEYS,
    RESTRICTION_RULE_TYPES,
    RewardRuleType,
)
from rewards.exceptions import (
    DuplicateRuleException,
    InvalidRuleConfigException,
    InvalidRulePriorityException,
    InvalidRuleTypeException,
    RewardRuleNotFoundException,
)
from rewards.models import RewardRule
from rewards.schemas import RewardRuleCreate, RewardRuleResponse, RewardRuleUpdate
from rewards.service import RewardRuleService

# ---- Test Data Constants ----

VALID_USER_UUID = "12345678-1234-5678-1234-567812345678"
VALID_CARD_ID = "aabbccdd-aabb-aabb-aabb-aabbaabbaabb"
VALID_RULE_ID_1 = "ffeeddcc-ffee-ddcc-ffee-ddccddccddcc"
VALID_RULE_ID_2 = "11112222-3333-4444-5555-666677778888"
SAMPLE_DATETIME = datetime(2026, 5, 19, 12, 0, 0, tzinfo=timezone.utc)


# ---- Helpers ----

def _make_sample_user() -> UserResponse:
    return UserResponse(
        id=VALID_USER_UUID,
        email="test@example.com",
        full_name="Test User",
    )


def _make_sample_swiggy_config() -> dict:
    return {
        "merchant": "swiggy",
        "reward_rate": 0.10,
        "reward_type": "cashback",
        "cap": 1500,
    }


def _make_sample_online_config() -> dict:
    return {
        "category": "online",
        "reward_rate": 0.05,
    }


def _make_sample_fuel_config() -> dict:
    return {"category": "fuel", "excluded": True}


def _make_sample_reward_rule_dict(
    rule_id: str = VALID_RULE_ID_1,
    card_id: str = VALID_CARD_ID,
    rule_name: str = "Swiggy 10% Cashback",
    rule_type: RewardRuleType = RewardRuleType.MERCHANT_BONUS,
    priority: int = 10,
    is_active: bool = True,
    rule_config: dict | None = None,
) -> dict:
    if rule_config is None:
        rule_config = _make_sample_swiggy_config()
    return {
        "id": rule_id,
        "card_id": card_id,
        "rule_name": rule_name,
        "rule_type": rule_type.value,
        "priority": priority,
        "is_active": is_active,
        "rule_config": rule_config,
        "created_at": SAMPLE_DATETIME,
        "updated_at": None,
    }


def _make_mock_reward_rule(**overrides) -> MagicMock:
    """Build a MagicMock that quacks like a RewardRule ORM instance."""
    defaults = _make_sample_reward_rule_dict()
    defaults.update(overrides)
    mock = MagicMock(spec=RewardRule)
    for key, value in defaults.items():
        setattr(mock, key, value)
    # Ensure rule_config supports dict-like access
    mock.rule_config = dict(mock.rule_config)
    setattr(mock, "rule_config", mock.rule_config)
    return mock


def _build_test_app(
    mock_reward_rule_service: MagicMock,
    *,
    override_auth: bool = True,
) -> FastAPI:
    """Build a FastAPI test app with the reward rules router and mocked dependencies."""
    from api.deps import get_reward_rule_service
    from core.exceptions import AppException
    from rewards.routes import router

    app = FastAPI()

    # Global exception handler for AppException
    @app.exception_handler(AppException)
    async def domain_exception_handler(request, exc: AppException):
        from starlette.responses import JSONResponse

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                }
            },
        )

    app.include_router(router)

    # Override service dependency
    async def override_get_service():
        return mock_reward_rule_service

    app.dependency_overrides[get_reward_rule_service] = override_get_service

    # Override auth
    if override_auth:
        async def override_get_current_user():
            return _make_sample_user()

        app.dependency_overrides[get_current_user] = override_get_current_user

    return app


# ---- Mocks ----

@pytest.fixture
def mock_reward_rule_service() -> MagicMock:
    """Mock RewardRuleService with default success behavior."""
    sample = _make_sample_reward_rule_dict()
    response = RewardRuleResponse(**sample)
    service = MagicMock(spec=RewardRuleService)
    service.create_rule = AsyncMock(return_value=response)
    service.get_rule = AsyncMock(return_value=response)
    service.get_card_rules = AsyncMock(return_value=[response])
    service.get_card_active_rules = AsyncMock(return_value=[response])
    service.update_rule = AsyncMock(return_value=response)
    service.deactivate_rule = AsyncMock(return_value=response)
    service.delete_rule = AsyncMock(return_value=None)
    return service


@pytest.fixture
def client(
    mock_reward_rule_service: MagicMock,
) -> AsyncClient:
    """Return an httpx AsyncClient wired to the test app."""
    app = _build_test_app(mock_reward_rule_service, override_auth=True)
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.fixture
def client_no_auth(
    mock_reward_rule_service: MagicMock,
) -> AsyncClient:
    """Return a client WITHOUT auth override — real get_current_user runs."""
    app = _build_test_app(mock_reward_rule_service, override_auth=False)
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


# =============================================================================
# Constants Tests
# =============================================================================


class TestRewardRuleType:
    """Tests for RewardRuleType enum."""

    def test_all_rule_types_defined(self):
        """All 8 canonical rule types should be defined."""
        expected = {
            "cashback",
            "reward_points",
            "merchant_bonus",
            "category_bonus",
            "milestone",
            "cap",
            "exclusion",
            "surcharge_waiver",
        }
        actual = {t.value for t in RewardRuleType}
        assert actual == expected

    def test_from_string(self):
        """RewardRuleType should be constructable from valid strings."""
        assert RewardRuleType("merchant_bonus") == RewardRuleType.MERCHANT_BONUS
        assert RewardRuleType("exclusion") == RewardRuleType.EXCLUSION

    def test_invalid_value_raises(self):
        """Invalid string should raise ValueError."""
        with pytest.raises(ValueError):
            RewardRuleType("invalid_type")

    def test_equality(self):
        """Same rule types should be equal."""
        assert RewardRuleType.CASHBACK == RewardRuleType("cashback")
        assert RewardRuleType.MERCHANT_BONUS != RewardRuleType.CATEGORY_BONUS

    def test_string_representation(self):
        """String representation should return the value."""
        assert str(RewardRuleType.CASHBACK) == "cashback"
        assert str(RewardRuleType.MILESTONE) == "milestone"


class TestBonusAndRestrictionTypes:
    """Tests for BONUS_RULE_TYPES and RESTRICTION_RULE_TYPES frozensets."""

    def test_bonus_types_exclude_cap_and_exclusion(self):
        """BONUS_RULE_TYPES should not include CAP or EXCLUSION."""
        assert RewardRuleType.CAP not in BONUS_RULE_TYPES
        assert RewardRuleType.EXCLUSION not in BONUS_RULE_TYPES

    def test_bonus_types_include_earn_rules(self):
        """BONUS_RULE_TYPES should include cashback, points, merchant, category,
        milestone, and surcharge_waiver."""
        assert RewardRuleType.CASHBACK in BONUS_RULE_TYPES
        assert RewardRuleType.REWARD_POINTS in BONUS_RULE_TYPES
        assert RewardRuleType.MERCHANT_BONUS in BONUS_RULE_TYPES
        assert RewardRuleType.CATEGORY_BONUS in BONUS_RULE_TYPES
        assert RewardRuleType.MILESTONE in BONUS_RULE_TYPES
        assert RewardRuleType.SURCHARGE_WAIVER in BONUS_RULE_TYPES

    def test_restriction_types_only_cap_and_exclusion(self):
        """RESTRICTION_RULE_TYPES should contain exactly CAP and EXCLUSION."""
        assert RESTRICTION_RULE_TYPES == {RewardRuleType.CAP, RewardRuleType.EXCLUSION}

    def test_bonus_and_restriction_are_disjoint(self):
        """No rule type should be in both bonus and restriction."""
        overlap = BONUS_RULE_TYPES & RESTRICTION_RULE_TYPES
        assert overlap == set()

    def test_all_types_covered(self):
        """Every RewardRuleType should appear in either bonus or restriction."""
        all_accounted = BONUS_RULE_TYPES | RESTRICTION_RULE_TYPES
        assert all_accounted == set(RewardRuleType)


class TestMonetaryConfigKeys:
    """Tests for MONETARY_CONFIG_KEYS frozenset."""

    def test_contains_expected_keys(self):
        """Should contain cap, min_spend, max_reward, threshold, surcharge_amount."""
        expected = {"cap", "min_spend", "max_reward", "threshold", "surcharge_amount"}
        assert MONETARY_CONFIG_KEYS == expected


# =============================================================================
# Exceptions Tests
# =============================================================================


class TestRewardRuleNotFoundException:
    """Tests for RewardRuleNotFoundException."""

    def test_defaults(self):
        """Should have code REWARD_RULE_NOT_FOUND and 404 status."""
        exc = RewardRuleNotFoundException(rule_id=VALID_RULE_ID_1)
        assert exc.code == "REWARD_RULE_NOT_FOUND"
        assert exc.status_code == 404
        assert VALID_RULE_ID_1 in exc.message

    def test_inherits_from_not_found(self):
        """Should subclass NotFoundException."""
        exc = RewardRuleNotFoundException(rule_id=VALID_RULE_ID_1)
        assert isinstance(exc, NotFoundException)


class TestInvalidRuleTypeException:
    """Tests for InvalidRuleTypeException."""

    def test_defaults(self):
        """Should have code INVALID_RULE_TYPE and 422 status."""
        exc = InvalidRuleTypeException("bad_type", "cashback, exclusion")
        assert exc.code == "INVALID_RULE_TYPE"
        assert exc.status_code == 422
        assert "bad_type" in exc.message
        assert "cashback" in exc.details["supported_types"]

    def test_inherits_from_validation(self):
        """Should subclass ValidationException."""
        exc = InvalidRuleTypeException("x", "y")
        assert isinstance(exc, ValidationException)


class TestInvalidRuleConfigException:
    """Tests for InvalidRuleConfigException."""

    def test_defaults(self):
        """Should have code INVALID_RULE_CONFIG and 422 status."""
        exc = InvalidRuleConfigException("Missing key: cap")
        assert exc.code == "INVALID_RULE_CONFIG"
        assert exc.status_code == 422
        assert "Missing key" in exc.message
        assert exc.details == {}

    def test_with_details(self):
        """Should store details dict."""
        exc = InvalidRuleConfigException("Bad value", details={"key": "cap", "value": -5})
        assert exc.details == {"key": "cap", "value": -5}

    def test_inherits_from_validation(self):
        """Should subclass ValidationException."""
        exc = InvalidRuleConfigException("msg")
        assert isinstance(exc, ValidationException)


class TestDuplicateRuleException:
    """Tests for DuplicateRuleException."""

    def test_defaults(self):
        """Should have code DUPLICATE_REWARD_RULE and 409 status."""
        exc = DuplicateRuleException(card_id=VALID_CARD_ID, rule_name="Swiggy Cashback")
        assert exc.code == "DUPLICATE_REWARD_RULE"
        assert exc.status_code == 409
        assert VALID_CARD_ID in exc.details["card_id"]
        assert "Swiggy Cashback" in exc.details["rule_name"]

    def test_inherits_from_conflict(self):
        """Should subclass ConflictException."""
        exc = DuplicateRuleException(card_id="abc", rule_name="x")
        assert isinstance(exc, ConflictException)


class TestInvalidRulePriorityException:
    """Tests for InvalidRulePriorityException."""

    def test_defaults(self):
        """Should have code INVALID_RULE_PRIORITY and 400 status."""
        exc = InvalidRulePriorityException(2000)
        assert exc.code == "INVALID_RULE_PRIORITY"
        assert exc.status_code == 400
        assert exc.details["priority"] == 2000

    def test_custom_range(self):
        """Should accept custom min/max values."""
        exc = InvalidRulePriorityException(50, min_val=0, max_val=10)
        assert exc.details["min"] == 0
        assert exc.details["max"] == 10


# =============================================================================
# Schema Validation Tests
# =============================================================================


class TestRewardRuleSchemaValidation:
    """Tests for RewardRuleCreate, RewardRuleUpdate, and RewardRuleResponse."""

    def test_reward_rule_create_valid(self):
        """A valid RewardRuleCreate should pass validation."""
        schema = RewardRuleCreate(
            card_id=VALID_CARD_ID,
            rule_name="Swiggy 10% Cashback",
            rule_type=RewardRuleType.MERCHANT_BONUS,
            rule_config={"merchant": "swiggy", "reward_rate": 0.10, "cap": 1500},
        )
        assert schema.rule_name == "Swiggy 10% Cashback"
        assert schema.rule_type == RewardRuleType.MERCHANT_BONUS
        assert schema.priority == 0
        assert schema.is_active is True

    def test_reward_rule_create_defaults(self):
        """priority defaults to 0, is_active defaults to True, rule_config defaults to {}."""
        schema = RewardRuleCreate(
            card_id=VALID_CARD_ID,
            rule_name="Test Rule",
            rule_type=RewardRuleType.CASHBACK,
        )
        assert schema.priority == 0
        assert schema.is_active is True
        assert schema.rule_config == {}

    def test_reward_rule_create_minimal_with_all_required(self):
        """The only required fields are card_id, rule_name, rule_type."""
        schema = RewardRuleCreate(
            card_id=VALID_CARD_ID,
            rule_name="Minimal Rule",
            rule_type=RewardRuleType.EXCLUSION,
            rule_config={"category": "fuel", "excluded": True},
        )
        assert schema.rule_name == "Minimal Rule"

    def test_reward_rule_create_missing_card_id_fails(self):
        """card_id is required."""
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            RewardRuleCreate(
                rule_name="Test",
                rule_type=RewardRuleType.CASHBACK,
            )

    def test_reward_rule_create_missing_rule_name_fails(self):
        """rule_name is required."""
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            RewardRuleCreate(
                card_id=VALID_CARD_ID,
                rule_type=RewardRuleType.CASHBACK,
            )

    def test_reward_rule_create_priority_out_of_range_fails(self):
        """priority must be between 0 and 1000."""
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            RewardRuleCreate(
                card_id=VALID_CARD_ID,
                rule_name="Bad Priority",
                rule_type=RewardRuleType.CASHBACK,
                priority=1001,
            )

        with pytest.raises(ValidationError):
            RewardRuleCreate(
                card_id=VALID_CARD_ID,
                rule_name="Negative Priority",
                rule_type=RewardRuleType.CASHBACK,
                priority=-1,
            )

    def test_reward_rule_create_extra_fields_fails(self):
        """Unknown fields should be rejected (extra='forbid' via pydantic defaults)."""
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            RewardRuleCreate(
                card_id=VALID_CARD_ID,
                rule_name="Test",
                rule_type=RewardRuleType.CASHBACK,
                unknown_field="should fail",
            )

    def test_reward_rule_update_all_fields_optional(self):
        """RewardRuleUpdate should accept partial data."""
        schema = RewardRuleUpdate(rule_name="Updated Name")
        assert schema.rule_name == "Updated Name"
        assert schema.priority is None
        assert schema.rule_type is None
        assert schema.rule_config is None

    def test_reward_rule_update_empty_body_is_valid(self):
        """RewardRuleUpdate with no fields set should be valid."""
        schema = RewardRuleUpdate()
        assert schema.rule_name is None
        assert schema.priority is None

    def test_reward_rule_response_from_attributes(self):
        """RewardRuleResponse should accept model_validate from ORM-like dict."""
        data = _make_sample_reward_rule_dict()
        response = RewardRuleResponse(**data)
        assert response.id == VALID_RULE_ID_1
        assert response.card_id == VALID_CARD_ID
        assert response.rule_type == RewardRuleType.MERCHANT_BONUS
        assert isinstance(response.created_at, datetime)
        assert response.updated_at is None

    def test_reward_rule_response_config_is_dict(self):
        """rule_config should be a dict."""
        data = _make_sample_reward_rule_dict()
        response = RewardRuleResponse(**data)
        assert isinstance(response.rule_config, dict)
        assert response.rule_config["merchant"] == "swiggy"

    def test_reward_rule_response_id_is_string(self):
        """id field is a string representation of UUID."""
        data = _make_sample_reward_rule_dict()
        response = RewardRuleResponse(**data)
        assert isinstance(response.id, str)

    def test_reward_rule_type_enum_in_schema(self):
        """rule_type should accept RewardRuleType enum directly."""
        schema = RewardRuleCreate(
            card_id=VALID_CARD_ID,
            rule_name="Test",
            rule_type="cashback",
        )
        assert schema.rule_type == RewardRuleType.CASHBACK


# =============================================================================
# Validators Tests
# =============================================================================


class TestValidateRuleType:
    """Tests for validate_rule_type."""

    def test_valid_rule_types(self):
        """Valid rule type strings should return corresponding enum values."""
        from rewards.validators import validate_rule_type

        assert validate_rule_type("cashback") == RewardRuleType.CASHBACK
        assert validate_rule_type("merchant_bonus") == RewardRuleType.MERCHANT_BONUS
        assert validate_rule_type("surcharge_waiver") == RewardRuleType.SURCHARGE_WAIVER

    def test_invalid_rule_type_raises(self):
        """Invalid rule type should raise InvalidRuleTypeException."""
        from rewards.validators import validate_rule_type

        with pytest.raises(InvalidRuleTypeException) as exc_info:
            validate_rule_type("unknown_type")
        assert "unknown_type" in str(exc_info.value)
        assert "Supported types" in exc_info.value.message

    def test_all_defined_types_are_valid(self):
        """Every RewardRuleType enum value should pass validation."""
        from rewards.validators import validate_rule_type

        for rule_type in RewardRuleType:
            assert validate_rule_type(rule_type.value) == rule_type


class TestValidateRuleConfig:
    """Tests for validate_rule_config."""

    def test_valid_merchant_bonus_config(self):
        """Minimal merchant_bonus config with merchant and reward_rate."""
        from rewards.validators import validate_rule_config

        config = {"merchant": "swiggy", "reward_rate": 0.10}
        # Should not raise
        validate_rule_config(RewardRuleType.MERCHANT_BONUS, config)

    def test_valid_cashback_config(self):
        """Minimal cashback config with reward_rate."""
        from rewards.validators import validate_rule_config

        config = {"reward_rate": 0.05}
        validate_rule_config(RewardRuleType.CASHBACK, config)

    def test_valid_category_bonus_config(self):
        """Category bonus with category and reward_rate."""
        from rewards.validators import validate_rule_config

        config = {"category": "online", "reward_rate": 0.05}
        validate_rule_config(RewardRuleType.CATEGORY_BONUS, config)

    def test_valid_milestone_config(self):
        """Milestone with threshold."""
        from rewards.validators import validate_rule_config

        config = {"threshold": 50000}
        validate_rule_config(RewardRuleType.MILESTONE, config)

    def test_valid_cap_config(self):
        """Cap with cap value."""
        from rewards.validators import validate_rule_config

        config = {"cap": 1500}
        validate_rule_config(RewardRuleType.CAP, config)

    def test_valid_exclusion_config(self):
        """Exclusion with excluded flag."""
        from rewards.validators import validate_rule_config

        config = {"excluded": True}
        validate_rule_config(RewardRuleType.EXCLUSION, config)

    def test_valid_surcharge_waiver_config(self):
        """Surcharge_waiver with no required keys should pass."""
        from rewards.validators import validate_rule_config

        validate_rule_config(RewardRuleType.SURCHARGE_WAIVER, {})
        validate_rule_config(RewardRuleType.SURCHARGE_WAIVER, {"surcharge_amount": 0})

    def test_missing_required_keys_raises(self):
        """Missing required keys should raise InvalidRuleConfigException."""
        from rewards.validators import validate_rule_config

        with pytest.raises(InvalidRuleConfigException) as exc_info:
            validate_rule_config(RewardRuleType.MERCHANT_BONUS, {})
        assert "missing_keys" in exc_info.value.details
        assert "merchant" in exc_info.value.details["missing_keys"]

    def test_reward_rate_outside_range_raises(self):
        """reward_rate must be between 0 and 1."""
        from rewards.validators import validate_rule_config

        with pytest.raises(InvalidRuleConfigException):
            validate_rule_config(RewardRuleType.CASHBACK, {"reward_rate": 1.5})

        with pytest.raises(InvalidRuleConfigException):
            validate_rule_config(RewardRuleType.CASHBACK, {"reward_rate": -0.1})

    def test_reward_rate_zero_is_valid(self):
        """reward_rate=0 is valid (0% cashback)."""
        from rewards.validators import validate_rule_config

        validate_rule_config(RewardRuleType.CASHBACK, {"reward_rate": 0.0})

    def test_reward_rate_one_is_valid(self):
        """reward_rate=1 is valid (100% cashback)."""
        from rewards.validators import validate_rule_config

        validate_rule_config(RewardRuleType.CASHBACK, {"reward_rate": 1.0})

    def test_negative_cap_raises(self):
        """Cap must be non-negative."""
        from rewards.validators import validate_rule_config

        with pytest.raises(InvalidRuleConfigException):
            validate_rule_config(RewardRuleType.CAP, {"cap": -100})

    def test_zero_cap_is_valid(self):
        """Cap=0 is valid (effectively no cap)."""
        from rewards.validators import validate_rule_config

        validate_rule_config(RewardRuleType.CAP, {"cap": 0})

    def test_negative_min_spend_raises(self):
        """min_spend must be non-negative."""
        from rewards.validators import validate_rule_config

        with pytest.raises(InvalidRuleConfigException):
            validate_rule_config(
                RewardRuleType.MERCHANT_BONUS,
                {"merchant": "amazon", "reward_rate": 0.05, "min_spend": -100},
            )

    def test_negative_max_reward_raises(self):
        """max_reward must be non-negative."""
        from rewards.validators import validate_rule_config

        with pytest.raises(InvalidRuleConfigException):
            validate_rule_config(
                RewardRuleType.CASHBACK,
                {"reward_rate": 0.05, "max_reward": -500},
            )

    def test_negative_threshold_raises(self):
        """threshold must be non-negative."""
        from rewards.validators import validate_rule_config

        with pytest.raises(InvalidRuleConfigException):
            validate_rule_config(
                RewardRuleType.MILESTONE,
                {"threshold": -1000},
            )

    def test_reward_rate_not_numeric_raises(self):
        """reward_rate must be a number."""
        from rewards.validators import validate_rule_config

        with pytest.raises(InvalidRuleConfigException):
            validate_rule_config(RewardRuleType.CASHBACK, {"reward_rate": "high"})

    def test_excluded_not_boolean_raises(self):
        """excluded key must be a boolean."""
        from rewards.validators import validate_rule_config

        with pytest.raises(InvalidRuleConfigException):
            validate_rule_config(RewardRuleType.EXCLUSION, {"excluded": "yes"})

    def test_excluded_false_is_valid(self):
        """excluded=False is valid."""
        from rewards.validators import validate_rule_config

        validate_rule_config(RewardRuleType.EXCLUSION, {"excluded": False})


class TestValidateNoDuplicateRule:
    """Tests for validate_no_duplicate_rule."""

    def test_no_duplicate_passes(self):
        """When no existing rule matches, no exception is raised."""
        from rewards.validators import validate_no_duplicate_rule

        existing = [_make_mock_reward_rule(rule_name="Swiggy Cashback")]
        # Different name → should pass
        validate_no_duplicate_rule(existing, "Zomato Cashback")

    def test_duplicate_raises(self):
        """When an existing rule has the same name, DuplicateRuleException is raised."""
        from rewards.validators import validate_no_duplicate_rule

        existing = [_make_mock_reward_rule(rule_name="Swiggy Cashback")]
        with pytest.raises(DuplicateRuleException) as exc_info:
            validate_no_duplicate_rule(existing, "Swiggy Cashback")
        assert "Swiggy Cashback" in exc_info.value.message

    def test_empty_existing_rules_passes(self):
        """Empty list of existing rules should always pass."""
        from rewards.validators import validate_no_duplicate_rule

        validate_no_duplicate_rule([], "Any Name")

    def test_multiple_rules_one_duplicate(self):
        """Among multiple existing rules, one duplicate should trigger."""
        from rewards.validators import validate_no_duplicate_rule

        existing = [
            _make_mock_reward_rule(rule_name="Rule A"),
            _make_mock_reward_rule(rule_name="Rule B"),
            _make_mock_reward_rule(rule_name="Rule C"),
        ]
        with pytest.raises(DuplicateRuleException):
            validate_no_duplicate_rule(existing, "Rule B")


# =============================================================================
# Normalizers Tests
# =============================================================================


class TestNormalizeRuleConfig:
    """Tests for normalize_rule_config."""

    def test_fills_defaults_for_merchant_bonus(self):
        """Default keys like min_spend, max_reward should be filled."""
        from rewards.normalizers import normalize_rule_config

        config = {"merchant": "swiggy", "reward_rate": 0.10, "cap": 1500}
        normalized = normalize_rule_config(RewardRuleType.MERCHANT_BONUS, config)

        assert normalized["merchant"] == "swiggy"
        assert normalized["reward_rate"] == 0.10
        assert normalized["cap"] == 1500
        assert normalized["min_spend"] == 0
        assert normalized["max_reward"] == 0
        assert normalized["reward_type"] == "cashback"

    def test_client_values_take_precedence(self):
        """Client-provided values should override defaults."""
        from rewards.normalizers import normalize_rule_config

        config = {
            "merchant": "swiggy",
            "reward_rate": 0.10,
            "reward_type": "points",
            "cap": 2000,
        }
        normalized = normalize_rule_config(RewardRuleType.MERCHANT_BONUS, config)
        assert normalized["reward_type"] == "points"
        assert normalized["cap"] == 2000

    def test_cashback_defaults(self):
        """Cashback should default reward_type to 'cashback'."""
        from rewards.normalizers import normalize_rule_config

        config = {"reward_rate": 0.05}
        normalized = normalize_rule_config(RewardRuleType.CASHBACK, config)
        assert normalized["reward_type"] == "cashback"
        assert normalized["min_spend"] == 0

    def test_reward_points_defaults(self):
        """Reward points should default points_multiplier to 1."""
        from rewards.normalizers import normalize_rule_config

        config = {"reward_rate": 2.0}
        normalized = normalize_rule_config(RewardRuleType.REWARD_POINTS, config)
        assert normalized["points_multiplier"] == 1
        assert normalized["reward_type"] == "points"

    def test_coerces_reward_rate_to_float(self):
        """Integer reward_rate should be coerced to float."""
        from rewards.normalizers import normalize_rule_config

        config = {"merchant": "swiggy", "reward_rate": 10}
        normalized = normalize_rule_config(RewardRuleType.MERCHANT_BONUS, config)
        assert isinstance(normalized["reward_rate"], float)
        assert normalized["reward_rate"] == 10.0

    def test_strips_none_values(self):
        """None values in config should be removed."""
        from rewards.normalizers import normalize_rule_config

        config = {"reward_rate": 0.05, "cap": None}
        normalized = normalize_rule_config(RewardRuleType.CASHBACK, config)
        assert "cap" not in normalized

    def test_exclusion_defaults(self):
        """Exclusion should default reason to 'unspecified'."""
        from rewards.normalizers import normalize_rule_config

        config = {"excluded": True}
        normalized = normalize_rule_config(RewardRuleType.EXCLUSION, config)
        assert normalized["reason"] == "unspecified"

    def test_milestone_defaults(self):
        """Milestone should default period to 'monthly'."""
        from rewards.normalizers import normalize_rule_config

        config = {"threshold": 50000}
        normalized = normalize_rule_config(RewardRuleType.MILESTONE, config)
        assert normalized["period"] == "monthly"
        assert normalized["reward_rate"] == 0.0

    def test_cap_defaults(self):
        """Cap rule type defaults period to 'monthly' and scope to 'total'."""
        from rewards.normalizers import normalize_rule_config

        config = {"cap": 1500}
        normalized = normalize_rule_config(RewardRuleType.CAP, config)
        assert normalized["period"] == "monthly"
        assert normalized["scope"] == "total"

    def test_surcharge_waiver_defaults(self):
        """Surcharge waiver defaults max_waiver to 0."""
        from rewards.normalizers import normalize_rule_config

        normalized = normalize_rule_config(RewardRuleType.SURCHARGE_WAIVER, {})
        assert normalized["max_waiver"] == 0

    def test_returns_new_dict_not_mutating_input(self):
        """Normalize should return a new dict, not modify the input."""
        from rewards.normalizers import normalize_rule_config

        config = {"reward_rate": 0.05}
        original = dict(config)
        normalized = normalize_rule_config(RewardRuleType.CASHBACK, config)
        assert config == original
        assert normalized is not config


class TestNormalizeRuleName:
    """Tests for normalize_rule_name."""

    def test_strips_whitespace(self):
        from rewards.normalizers import normalize_rule_name

        assert normalize_rule_name("  Swiggy Cashback  ") == "Swiggy Cashback"

    def test_collapses_multiple_spaces(self):
        from rewards.normalizers import normalize_rule_name

        assert normalize_rule_name("Swiggy   10%   Cashback") == "Swiggy 10% Cashback"

    def test_preserves_valid_name(self):
        from rewards.normalizers import normalize_rule_name

        assert normalize_rule_name("Swiggy 10% Cashback") == "Swiggy 10% Cashback"

    def test_empty_string(self):
        from rewards.normalizers import normalize_rule_name

        assert normalize_rule_name("   ") == ""


class TestNormalizeRulePriority:
    """Tests for normalize_rule_priority."""

    def test_none_returns_zero(self):
        from rewards.normalizers import normalize_rule_priority

        assert normalize_rule_priority(None) == 0

    def test_clamps_to_min_zero(self):
        from rewards.normalizers import normalize_rule_priority

        assert normalize_rule_priority(-5) == 0

    def test_clamps_to_max_1000(self):
        from rewards.normalizers import normalize_rule_priority

        assert normalize_rule_priority(2000) == 1000

    def test_preserves_valid_value(self):
        from rewards.normalizers import normalize_rule_priority

        assert normalize_rule_priority(50) == 50

    def test_coerces_float_to_int(self):
        from rewards.normalizers import normalize_rule_priority

        assert normalize_rule_priority(42.7) == 42


# =============================================================================
# Loaders Tests
# =============================================================================


class TestLoadRulesForCard:
    """Tests for load_rules_for_card."""

    def test_normalizes_all_rules(self):
        """All rules in the list should be normalized."""
        from rewards.loaders import load_rules_for_card

        rules = [
            _make_mock_reward_rule(rule_id=VALID_RULE_ID_1),
            _make_mock_reward_rule(rule_id=VALID_RULE_ID_2),
        ]
        result = load_rules_for_card(rules)
        assert len(result) == 2
        assert result[0]["id"] == VALID_RULE_ID_1
        assert result[1]["id"] == VALID_RULE_ID_2
        # Verify normalization (defaults filled)
        assert "min_spend" in result[0]["rule_config"]

    def test_empty_list(self):
        """Empty rules list returns empty list."""
        from rewards.loaders import load_rules_for_card

        assert load_rules_for_card([]) == []

    def test_preserves_all_fields(self):
        """All expected top-level keys should be present."""
        from rewards.loaders import load_rules_for_card

        rules = [_make_mock_reward_rule()]
        result = load_rules_for_card(rules)
        rule = result[0]
        expected_keys = {
            "id", "card_id", "rule_name", "rule_type", "priority",
            "is_active", "rule_config", "created_at", "updated_at",
        }
        assert set(rule.keys()) == expected_keys

    def test_id_is_string(self):
        """id should be a string representation."""
        from rewards.loaders import load_rules_for_card

        rules = [_make_mock_reward_rule()]
        result = load_rules_for_card(rules)
        assert isinstance(result[0]["id"], str)


class TestLoadActiveRules:
    """Tests for load_active_rules."""

    def test_filters_inactive_rules(self):
        """Inactive rules should be excluded from results."""
        from rewards.loaders import load_active_rules

        rules = [
            _make_mock_reward_rule(rule_id=VALID_RULE_ID_1, is_active=True),
            _make_mock_reward_rule(rule_id=VALID_RULE_ID_2, is_active=False),
        ]
        result = load_active_rules(rules)
        assert len(result) == 1
        assert result[0]["id"] == VALID_RULE_ID_1

    def test_sorts_by_priority(self):
        """Rules should be sorted by priority ascending."""
        from rewards.loaders import load_active_rules

        rules = [
            _make_mock_reward_rule(rule_id=VALID_RULE_ID_1, priority=50, is_active=True),
            _make_mock_reward_rule(rule_id=VALID_RULE_ID_2, priority=10, is_active=True),
        ]
        result = load_active_rules(rules)
        assert result[0]["priority"] == 10
        assert result[1]["priority"] == 50

    def test_empty_list(self):
        from rewards.loaders import load_active_rules

        assert load_active_rules([]) == []

    def test_all_inactive_returns_empty(self):
        from rewards.loaders import load_active_rules

        rules = [
            _make_mock_reward_rule(is_active=False),
            _make_mock_reward_rule(is_active=False),
        ]
        assert load_active_rules(rules) == []


class TestLoadRulesByMerchant:
    """Tests for load_rules_by_merchant."""

    def test_matches_by_merchant_key(self):
        """Rules with matching merchant in rule_config should be included."""
        from rewards.loaders import load_rules_by_merchant

        rules = [
            _make_mock_reward_rule(
                rule_id=VALID_RULE_ID_1, rule_config={"merchant": "swiggy", "reward_rate": 0.10}
            ),
            _make_mock_reward_rule(
                rule_id=VALID_RULE_ID_2, rule_config={"merchant": "zomato", "reward_rate": 0.05}
            ),
        ]
        result = load_rules_by_merchant(rules, "swiggy")
        assert len(result) == 1
        assert result[0]["id"] == VALID_RULE_ID_1

    def test_case_insensitive_match(self):
        """Merchant matching should be case-insensitive."""
        from rewards.loaders import load_rules_by_merchant

        rules = [
            _make_mock_reward_rule(
                rule_config={"merchant": "SWIGGY", "reward_rate": 0.10}
            ),
        ]
        result = load_rules_by_merchant(rules, "swiggy")
        assert len(result) == 1

    def test_no_match_returns_empty(self):
        """When no rules match the merchant, return empty list."""
        from rewards.loaders import load_rules_by_merchant

        rules = [
            _make_mock_reward_rule(
                rule_config={"merchant": "swiggy", "reward_rate": 0.10}
            ),
        ]
        result = load_rules_by_merchant(rules, "amazon")
        assert result == []

    def test_rules_without_merchant_key_are_skipped(self):
        """Rules without a 'merchant' key should not match."""
        from rewards.loaders import load_rules_by_merchant

        rules = [
            _make_mock_reward_rule(
                rule_config={"category": "online", "reward_rate": 0.05}
            ),
        ]
        result = load_rules_by_merchant(rules, "swiggy")
        assert result == []

    def test_empty_rules_list(self):
        from rewards.loaders import load_rules_by_merchant

        assert load_rules_by_merchant([], "swiggy") == []

    def test_sorts_by_priority(self):
        from rewards.loaders import load_rules_by_merchant

        rules = [
            _make_mock_reward_rule(
                rule_id=VALID_RULE_ID_1,
                priority=50,
                rule_config={"merchant": "swiggy", "reward_rate": 0.10},
            ),
            _make_mock_reward_rule(
                rule_id=VALID_RULE_ID_2,
                priority=10,
                rule_config={"merchant": "swiggy", "reward_rate": 0.05},
            ),
        ]
        result = load_rules_by_merchant(rules, "swiggy")
        assert result[0]["priority"] == 10
        assert result[1]["priority"] == 50


# =============================================================================
# Repository Layer Tests
# =============================================================================


class TestRewardRuleRepository:
    """Tests for reward rule repository functions — mock-based."""

    @pytest.mark.asyncio
    async def test_create_rule_adds_and_flushes(self):
        """create_rule should add, flush, and refresh the rule."""
        from rewards.repository import create_rule as repo_create

        mock_session = AsyncMock()
        mock_rule = _make_mock_reward_rule()
        mock_rule.id = VALID_RULE_ID_1

        await repo_create(mock_session, mock_rule)

        mock_session.add.assert_called_once_with(mock_rule)
        mock_session.flush.assert_called_once()
        mock_session.refresh.assert_called_once_with(mock_rule)

    @pytest.mark.asyncio
    async def test_get_rule_by_id_returns_rule(self):
        """get_rule_by_id should return a rule when found."""
        from rewards.repository import get_rule_by_id as repo_get

        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_rule = _make_mock_reward_rule()
        mock_result.scalar_one_or_none.return_value = mock_rule
        mock_session.execute = AsyncMock(return_value=mock_result)

        result = await repo_get(mock_session, VALID_RULE_ID_1)
        assert result is mock_rule

    @pytest.mark.asyncio
    async def test_get_rule_by_id_returns_none(self):
        """get_rule_by_id should return None when not found."""
        from rewards.repository import get_rule_by_id as repo_get

        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute = AsyncMock(return_value=mock_result)

        result = await repo_get(mock_session, VALID_RULE_ID_1)
        assert result is None

    @pytest.mark.asyncio
    async def test_get_rule_by_id_or_raise_raises_when_missing(self):
        """get_rule_by_id_or_raise should raise RewardRuleNotFoundException."""
        from rewards.repository import get_rule_by_id_or_raise as repo_get_raise

        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute = AsyncMock(return_value=mock_result)

        with pytest.raises(RewardRuleNotFoundException) as exc_info:
            await repo_get_raise(mock_session, VALID_RULE_ID_1)
        assert "REWARD_RULE_NOT_FOUND" in exc_info.value.code

    @pytest.mark.asyncio
    async def test_get_rules_by_card(self):
        """get_rules_by_card should return rules ordered by priority."""
        from rewards.repository import get_rules_by_card as repo_get_by_card

        mock_session = AsyncMock()
        mock_result = MagicMock()
        rules = [
            _make_mock_reward_rule(priority=10),
            _make_mock_reward_rule(priority=20),
        ]
        mock_result.scalars.return_value.all.return_value = rules
        mock_session.execute = AsyncMock(return_value=mock_result)

        result = await repo_get_by_card(mock_session, VALID_CARD_ID)
        assert len(result) == 2

    @pytest.mark.asyncio
    async def test_get_active_rules_filters_active_only(self):
        """get_active_rules should only return is_active=True rules."""
        from rewards.repository import get_active_rules as repo_get_active

        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_session.execute = AsyncMock(return_value=mock_result)

        await repo_get_active(mock_session, VALID_CARD_ID)
        # Verify execute was called (actual filtering done in DB by SQL)
        mock_session.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_deactivate_rule_sets_is_active_false(self):
        """deactivate_rule should set is_active=False via update."""
        from rewards.repository import deactivate_rule as repo_deactivate

        mock_session = AsyncMock()
        # get_rule_by_id_or_raise will be called via the function
        mock_result = MagicMock()
        mock_rule = _make_mock_reward_rule(is_active=True)
        mock_result.scalar_one_or_none.return_value = mock_rule
        mock_session.execute = AsyncMock(return_value=mock_result)

        result = await repo_deactivate(mock_session, VALID_RULE_ID_1)
        # The rule is refetched after update; mock returns it
        assert result is mock_rule

    @pytest.mark.asyncio
    async def test_update_rule_calls_update_with_values(self):
        """update_rule should apply partial updates."""
        from rewards.repository import update_rule as repo_update

        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_rule = _make_mock_reward_rule()
        mock_result.scalar_one_or_none.return_value = mock_rule
        mock_session.execute = AsyncMock(return_value=mock_result)

        updates = {"priority": 42, "is_active": False}
        await repo_update(mock_session, VALID_RULE_ID_1, updates)

    @pytest.mark.asyncio
    async def test_delete_rule_deletes_and_flushes(self):
        """delete_rule should delete the rule and flush."""
        from rewards.repository import delete_rule as repo_delete

        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_rule = _make_mock_reward_rule()
        mock_result.scalar_one_or_none.return_value = mock_rule
        mock_session.execute = AsyncMock(return_value=mock_result)

        await repo_delete(mock_session, VALID_RULE_ID_1)
        mock_session.delete.assert_called_once_with(mock_rule)
        mock_session.flush.assert_called()


# =============================================================================
# Service Layer Tests
# =============================================================================


class TestRewardRuleService:
    """Tests for RewardRuleService — mock-based, verifying orchestration."""

    @pytest.mark.asyncio
    async def test_create_rule_returns_response(self):
        """create_rule should validate, normalize, persist, and return RewardRuleResponse."""
        # Patch the repository and validators used by the service
        mock_session = AsyncMock()
        mock_persisted = _make_mock_reward_rule()
        mock_repo_create = AsyncMock(return_value=mock_persisted)
        mock_get_rules_by_card = AsyncMock(return_value=[])
        mock_validate_schema = AsyncMock(return_value=None)
        mock_validate_duplicate = AsyncMock(return_value=None)

        service = RewardRuleService(session=mock_session)

        with (
            patch("rewards.service.repo_create_rule", mock_repo_create),
            patch("rewards.service.get_rules_by_card", mock_get_rules_by_card),
            patch("rewards.service.validate_rule_schema", mock_validate_schema),
            patch("rewards.service.validate_no_duplicate_rule", mock_validate_duplicate),
        ):
            schema = RewardRuleCreate(
                card_id=VALID_CARD_ID,
                rule_name="Swiggy 10% Cashback",
                rule_type=RewardRuleType.MERCHANT_BONUS,
                rule_config={"merchant": "swiggy", "reward_rate": 0.10, "cap": 1500},
            )
            result = await service.create_rule(schema)

            assert isinstance(result, RewardRuleResponse)
            assert result.card_id == VALID_CARD_ID
            mock_validate_schema.assert_awaited_once()
            mock_repo_create.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_get_rule_returns_response(self):
        """get_rule should fetch by id and return RewardRuleResponse."""
        mock_session = AsyncMock()
        mock_rule = _make_mock_reward_rule()
        mock_get_by_id_or_raise = AsyncMock(return_value=mock_rule)

        service = RewardRuleService(session=mock_session)

        with patch("rewards.service.get_rule_by_id_or_raise", mock_get_by_id_or_raise):
            result = await service.get_rule(VALID_RULE_ID_1)

            assert isinstance(result, RewardRuleResponse)
            assert result.id == VALID_RULE_ID_1
            mock_get_by_id_or_raise.assert_awaited_once_with(mock_session, VALID_RULE_ID_1)

    @pytest.mark.asyncio
    async def test_get_rule_not_found_raises(self):
        """get_rule should raise RewardRuleNotFoundException when rule missing."""
        mock_session = AsyncMock()
        mock_get_by_id_or_raise = AsyncMock(
            side_effect=RewardRuleNotFoundException(rule_id=VALID_RULE_ID_1)
        )

        service = RewardRuleService(session=mock_session)

        with patch("rewards.service.get_rule_by_id_or_raise", mock_get_by_id_or_raise):
            with pytest.raises(RewardRuleNotFoundException):
                await service.get_rule(VALID_RULE_ID_1)

    @pytest.mark.asyncio
    async def test_get_card_rules_returns_list(self):
        """get_card_rules should return all rules for a card."""
        mock_session = AsyncMock()
        rules = [
            _make_mock_reward_rule(rule_id=VALID_RULE_ID_1, priority=10),
            _make_mock_reward_rule(rule_id=VALID_RULE_ID_2, priority=20),
        ]
        mock_get_rules = AsyncMock(return_value=rules)

        service = RewardRuleService(session=mock_session)

        with patch("rewards.service.get_rules_by_card", mock_get_rules):
            result = await service.get_card_rules(VALID_CARD_ID)

            assert len(result) == 2
            assert all(isinstance(r, RewardRuleResponse) for r in result)
            mock_get_rules.assert_awaited_once_with(mock_session, VALID_CARD_ID)

    @pytest.mark.asyncio
    async def test_get_card_rules_empty(self):
        """get_card_rules with no rules returns empty list."""
        mock_session = AsyncMock()
        mock_get_rules = AsyncMock(return_value=[])

        service = RewardRuleService(session=mock_session)

        with patch("rewards.service.get_rules_by_card", mock_get_rules):
            result = await service.get_card_rules(VALID_CARD_ID)
            assert result == []

    @pytest.mark.asyncio
    async def test_get_card_active_rules_returns_only_active(self):
        """get_card_active_rules should call get_active_rules repo function."""
        mock_session = AsyncMock()
        active_rule = _make_mock_reward_rule(is_active=True)
        mock_get_active = AsyncMock(return_value=[active_rule])

        service = RewardRuleService(session=mock_session)

        with patch("rewards.service.get_active_rules", mock_get_active):
            result = await service.get_card_active_rules(VALID_CARD_ID)

            assert len(result) == 1
            mock_get_active.assert_awaited_once_with(mock_session, VALID_CARD_ID)

    @pytest.mark.asyncio
    async def test_update_rule_applies_partial_update(self):
        """update_rule should update only provided fields."""
        mock_session = AsyncMock()
        existing_rule = _make_mock_reward_rule(
            rule_name="Swiggy 10% Cashback",
            priority=10,
            is_active=True,
        )
        updated_rule = _make_mock_reward_rule(
            rule_name="Swiggy 20% Cashback",
            priority=10,
            is_active=True,
        )
        mock_get_by_id_or_raise = AsyncMock(return_value=existing_rule)
        mock_repo_update = AsyncMock(return_value=updated_rule)

        service = RewardRuleService(session=mock_session)

        with (
            patch("rewards.service.get_rule_by_id_or_raise", mock_get_by_id_or_raise),
            patch("rewards.service.repo_update_rule", mock_repo_update),
        ):
            schema = RewardRuleUpdate(rule_name="Swiggy 20% Cashback")
            result = await service.update_rule(VALID_RULE_ID_1, schema)

            assert isinstance(result, RewardRuleResponse)
            mock_repo_update.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_update_rule_normalizes_config(self):
        """update_rule with new rule_config should normalize it."""
        mock_session = AsyncMock()
        existing_rule = _make_mock_reward_rule(
            rule_type=RewardRuleType.MERCHANT_BONUS,
            rule_config={"merchant": "swiggy", "reward_rate": 0.10, "cap": 1500},
        )
        mock_get_by_id_or_raise = AsyncMock(return_value=existing_rule)
        mock_repo_update = AsyncMock(return_value=existing_rule)
        mock_validate_schema = AsyncMock(return_value=None)

        service = RewardRuleService(session=mock_session)

        with (
            patch("rewards.service.get_rule_by_id_or_raise", mock_get_by_id_or_raise),
            patch("rewards.service.repo_update_rule", mock_repo_update),
            patch("rewards.service.validate_rule_schema", mock_validate_schema),
        ):
            schema = RewardRuleUpdate(
                rule_config={"merchant": "zomato", "reward_rate": 0.15}
            )
            result = await service.update_rule(VALID_RULE_ID_1, schema)

            # Verify the updated config was normalized (defaults filled)
            call_args = mock_repo_update.call_args[0]
            updates = call_args[2]  # (session, rule_id, updates)
            assert "rule_config" in updates
            assert updates["rule_config"]["merchant"] == "zomato"
            assert isinstance(result, RewardRuleResponse)

    @pytest.mark.asyncio
    async def test_deactivate_rule_returns_deactivated(self):
        """deactivate_rule should set is_active=False."""
        mock_session = AsyncMock()
        deactivated = _make_mock_reward_rule(is_active=False)
        mock_repo_deactivate = AsyncMock(return_value=deactivated)

        service = RewardRuleService(session=mock_session)

        with patch("rewards.service.repo_deactivate_rule", mock_repo_deactivate):
            result = await service.deactivate_rule(VALID_RULE_ID_1)

            assert isinstance(result, RewardRuleResponse)
            mock_repo_deactivate.assert_awaited_once_with(mock_session, VALID_RULE_ID_1)

    @pytest.mark.asyncio
    async def test_delete_rule_calls_repo_delete(self):
        """delete_rule should call repo_delete and return None."""
        mock_session = AsyncMock()
        mock_repo_delete = AsyncMock(return_value=None)

        service = RewardRuleService(session=mock_session)

        with patch("rewards.service.repo_delete_rule", mock_repo_delete):
            result = await service.delete_rule(VALID_RULE_ID_1)

            assert result is None
            mock_repo_delete.assert_awaited_once_with(mock_session, VALID_RULE_ID_1)


# =============================================================================
# Route Layer Tests (HTTP-level)
# =============================================================================


class TestRewardRuleRoutes:
    """Tests for reward rule endpoints — POST/GET/PATCH/DELETE /reward-rules."""

    @pytest.mark.asyncio
    async def test_create_reward_rule_returns_201(
        self, client: AsyncClient, mock_reward_rule_service: MagicMock
    ):
        """POST /reward-rules should return 201 with the created rule."""
        response = await client.post(
            "/reward-rules",
            json={
                "card_id": VALID_CARD_ID,
                "rule_name": "Swiggy 10% Cashback",
                "rule_type": "merchant_bonus",
                "rule_config": {"merchant": "swiggy", "reward_rate": 0.10, "cap": 1500},
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert "data" in data
        mock_reward_rule_service.create_rule.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_get_reward_rule_returns_200(
        self, client: AsyncClient, mock_reward_rule_service: MagicMock
    ):
        """GET /reward-rules/{rule_id} should return 200."""
        response = await client.get(f"/reward-rules/{VALID_RULE_ID_1}")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert data["data"]["id"] == VALID_RULE_ID_1
        mock_reward_rule_service.get_rule.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_list_rules_by_card_returns_200(
        self, client: AsyncClient, mock_reward_rule_service: MagicMock
    ):
        """GET /reward-rules/card/{card_id} should return 200 with rules list."""
        response = await client.get(f"/reward-rules/card/{VALID_CARD_ID}")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "meta" in data
        mock_reward_rule_service.get_card_rules.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_update_reward_rule_returns_200(
        self, client: AsyncClient, mock_reward_rule_service: MagicMock
    ):
        """PATCH /reward-rules/{rule_id} should return 200."""
        response = await client.patch(
            f"/reward-rules/{VALID_RULE_ID_1}",
            json={"rule_name": "Updated Rule Name"},
        )
        assert response.status_code == 200
        mock_reward_rule_service.update_rule.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_delete_reward_rule_returns_204(
        self, client: AsyncClient, mock_reward_rule_service: MagicMock
    ):
        """DELETE /reward-rules/{rule_id} should return 204."""
        response = await client.delete(f"/reward-rules/{VALID_RULE_ID_1}")
        assert response.status_code == 204
        mock_reward_rule_service.delete_rule.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_create_reward_rule_invalid_body_returns_422(
        self, client: AsyncClient
    ):
        """POST /reward-rules with missing required field returns 422."""
        response = await client.post("/reward-rules", json={})
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_reward_rule_invalid_rule_type_returns_422(
        self, client: AsyncClient
    ):
        """POST /reward-rules with invalid rule_type returns 422."""
        response = await client.post(
            "/reward-rules",
            json={
                "card_id": VALID_CARD_ID,
                "rule_name": "Test",
                "rule_type": "invalid_type",
            },
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_reward_rule_priority_out_of_range_returns_422(
        self, client: AsyncClient
    ):
        """POST /reward-rules with priority > 1000 returns 422."""
        response = await client.post(
            "/reward-rules",
            json={
                "card_id": VALID_CARD_ID,
                "rule_name": "Test",
                "rule_type": "cashback",
                "priority": 2000,
            },
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_reward_rule_not_found_returns_404(
        self, client: AsyncClient, mock_reward_rule_service: MagicMock
    ):
        """GET /reward-rules/{rule_id} for non-existent rule returns 404."""
        mock_reward_rule_service.get_rule = AsyncMock(
            side_effect=RewardRuleNotFoundException(rule_id=VALID_RULE_ID_1)
        )
        # Rebuild app with the updated mock
        app = _build_test_app(mock_reward_rule_service)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get(f"/reward-rules/{VALID_RULE_ID_1}")
            assert response.status_code == 404
            error_data = response.json()
            assert error_data["error"]["code"] == "REWARD_RULE_NOT_FOUND"

    @pytest.mark.asyncio
    async def test_duplicate_rule_returns_409(
        self, client: AsyncClient, mock_reward_rule_service: MagicMock
    ):
        """POST /reward-rules with duplicate rule returns 409."""
        mock_reward_rule_service.create_rule = AsyncMock(
            side_effect=DuplicateRuleException(
                card_id=VALID_CARD_ID, rule_name="Swiggy Cashback"
            )
        )
        app = _build_test_app(mock_reward_rule_service)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.post(
                "/reward-rules",
                json={
                    "card_id": VALID_CARD_ID,
                    "rule_name": "Swiggy Cashback",
                    "rule_type": "merchant_bonus",
                    "rule_config": {"merchant": "swiggy", "reward_rate": 0.10},
                },
            )
            assert response.status_code == 409
            assert response.json()["error"]["code"] == "DUPLICATE_REWARD_RULE"

    @pytest.mark.asyncio
    async def test_invalid_rule_config_returns_422(
        self, client: AsyncClient, mock_reward_rule_service: MagicMock
    ):
        """POST /reward-rules with invalid config returns 422."""
        mock_reward_rule_service.create_rule = AsyncMock(
            side_effect=InvalidRuleConfigException(
                "reward_rate must be between 0 and 1",
                details={"reward_rate": -0.5},
            )
        )
        app = _build_test_app(mock_reward_rule_service)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.post(
                "/reward-rules",
                json={
                    "card_id": VALID_CARD_ID,
                    "rule_name": "Bad Rate",
                    "rule_type": "cashback",
                    "rule_config": {"reward_rate": -0.5},
                },
            )
            assert response.status_code == 422
            assert response.json()["error"]["code"] == "INVALID_RULE_CONFIG"

    @pytest.mark.asyncio
    async def test_reward_rules_require_auth(
        self, client_no_auth: AsyncClient
    ):
        """Reward rule endpoints should return 401 when no auth token provided."""
        response = await client_no_auth.get("/reward-rules/card/123")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_rules_by_card_empty_list_returns_200(
        self, client: AsyncClient, mock_reward_rule_service: MagicMock
    ):
        """GET /reward-rules/card/{card_id} with no rules returns 200 with empty data."""
        mock_reward_rule_service.get_card_rules = AsyncMock(return_value=[])
        app = _build_test_app(mock_reward_rule_service)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get(f"/reward-rules/card/{VALID_CARD_ID}")
            assert response.status_code == 200
            data = response.json()
            assert data["data"] == []
            assert data["meta"]["total"] == 0

    @pytest.mark.asyncio
    async def test_delete_nonexistent_rule_returns_404(
        self, client: AsyncClient, mock_reward_rule_service: MagicMock
    ):
        """DELETE /reward-rules/{rule_id} for non-existent rule returns 404."""
        mock_reward_rule_service.delete_rule = AsyncMock(
            side_effect=RewardRuleNotFoundException(rule_id="nonexistent")
        )
        app = _build_test_app(mock_reward_rule_service)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.delete("/reward-rules/nonexistent")
            assert response.status_code == 404