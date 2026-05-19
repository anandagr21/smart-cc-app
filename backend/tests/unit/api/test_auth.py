"""
Module: backend.tests.unit.api.test_auth
Responsibility: Unit tests for the auth route handlers (POST /register, POST /login, GET /me).

Architectural Boundaries:
- Tests route handlers in isolation — all dependencies (AuthService, UserRepository, get_current_user) are mocked.
- Verifies request validation, delegation to the service layer, response formatting, and status codes.
- No real database, no real JWT signing, no real password hashing.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from auth.dependencies import get_current_user
from auth.schemas import TokenResponse, UserResponse
from auth.service import AuthService
from core.exceptions import ConflictException, UnauthorizedException


# ---- Test Data Constants ----

VALID_USER_UUID = uuid.UUID("12345678-1234-5678-1234-567812345678")
VALID_EMAIL = "newuser@example.com"
VALID_NAME = "New User"
VALID_PASSWORD = "securepassword123"
VALID_TOKEN = "eyJhbGciOiJIUzI1NiJ9.mock_token"


# ---- Helpers ----

def _make_sample_user() -> UserResponse:
    return UserResponse(id=VALID_USER_UUID, email=VALID_EMAIL, full_name=VALID_NAME)


def _make_register_payload(
    email: str = VALID_EMAIL,
    password: str = VALID_PASSWORD,
    full_name: str = VALID_NAME,
) -> dict:
    return {"email": email, "password": password, "full_name": full_name}


def _make_login_payload(
    email: str = VALID_EMAIL,
    password: str = VALID_PASSWORD,
) -> dict:
    return {"email": email, "password": password}


def _build_test_app(mock_service: MagicMock, mock_user_repo: AsyncMock = None, *, override_get_current_user: bool = True) -> FastAPI:
    """Build a FastAPI test app with the auth router and mocked dependencies.

    Args:
        mock_service: Mocked AuthService instance.
        mock_user_repo: Mocked UserRepository instance (optional, creates one if None).
        override_get_current_user: If True, override get_current_user to return a sample user.
                                   If False, the real get_current_user dependency runs
                                   (useful for testing token validation behavior).

    IMPORTANT: Registers a global exception handler for DomainException so that
    service-layer exceptions are properly converted to HTTP error responses.
    """
    from api.v1.auth import _get_auth_service, router
    from api.deps import get_user_repo
    from core.exceptions import DomainException
    from starlette.requests import Request
    from starlette.responses import JSONResponse

    if mock_user_repo is None:
        mock_user_repo = AsyncMock()

    sample_user = UserResponse(
        id=VALID_USER_UUID,
        email=VALID_EMAIL,
        full_name=VALID_NAME,
    )

    app = FastAPI()

    # Register global exception handler — converts DomainException to HTTP responses
    @app.exception_handler(DomainException)
    async def domain_exception_handler(request: Request, exc: DomainException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.error_code,
                    "message": exc.message,
                    "details": exc.details,
                }
            },
        )

    app.include_router(router)

    # Override auth service provider
    async def override_get_auth_service():
        return mock_service

    app.dependency_overrides[_get_auth_service] = override_get_auth_service

    # Override user repo
    async def override_get_user_repo():
        return mock_user_repo

    app.dependency_overrides[get_user_repo] = override_get_user_repo

    # Optionally override get_current_user
    if override_get_current_user:
        async def override_get_current_user():
            return sample_user

        app.dependency_overrides[get_current_user] = override_get_current_user

    return app


# ---- Fixtures ----

@pytest.fixture
def mock_auth_service() -> MagicMock:
    """Return a mocked AuthService with default success behavior."""
    sample_user = UserResponse(
        id=VALID_USER_UUID,
        email=VALID_EMAIL,
        full_name=VALID_NAME,
    )
    sample_token = TokenResponse(
        access_token=VALID_TOKEN,
        user=sample_user,
    )

    service = MagicMock(spec=AuthService)
    service.register = AsyncMock(return_value=sample_token)
    service.login = AsyncMock(return_value=sample_token)
    service.get_current_user = AsyncMock(return_value=sample_user)
    return service


@pytest.fixture
def client(mock_auth_service: MagicMock) -> AsyncClient:
    """Return an httpx AsyncClient wired to a test app with all auth deps overridden."""
    app = _build_test_app(mock_auth_service, override_get_current_user=True)
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.fixture
def client_no_auth_override() -> AsyncClient:
    """Return a client where get_current_user is NOT overridden.

    The real token validation dependency runs — used to test missing/invalid tokens.
    """
    sample_user = UserResponse(
        id=VALID_USER_UUID,
        email=VALID_EMAIL,
        full_name=VALID_NAME,
    )
    sample_token = TokenResponse(
        access_token=VALID_TOKEN,
        user=sample_user,
    )

    mock_service = MagicMock(spec=AuthService)
    mock_service.register = AsyncMock(return_value=sample_token)
    mock_service.login = AsyncMock(return_value=sample_token)
    mock_service.get_current_user = AsyncMock(return_value=sample_user)

    app = _build_test_app(mock_service, override_get_current_user=False)
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


# =============================================================================
# POST /auth/register
# =============================================================================


class TestRegisterRoute:
    """Tests for POST /auth/register."""

    @pytest.mark.asyncio
    async def test_register_returns_201_with_token_response(
        self, client: AsyncClient, mock_auth_service: MagicMock
    ):
        """A valid registration request returns HTTP 201 with token + user data."""
        payload = _make_register_payload()

        response = await client.post("/auth/register", json=payload)

        assert response.status_code == 201
        data = response.json()
        assert "data" in data
        assert data["data"]["access_token"] == VALID_TOKEN
        assert data["data"]["token_type"] == "bearer"
        assert data["data"]["user"]["email"] == VALID_EMAIL
        assert data["data"]["user"]["full_name"] == VALID_NAME

        mock_auth_service.register.assert_awaited_once()
        call_arg = mock_auth_service.register.call_args[0][0]
        assert call_arg.email == VALID_EMAIL
        assert call_arg.password == VALID_PASSWORD
        assert call_arg.full_name == VALID_NAME

    @pytest.mark.asyncio
    async def test_register_with_empty_full_name_returns_422(self, client: AsyncClient):
        """An empty full_name triggers a 422 validation error."""
        payload = _make_register_payload(full_name="")

        response = await client.post("/auth/register", json=payload)

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_with_short_password_returns_422(self, client: AsyncClient):
        """A password shorter than 8 characters triggers a 422 validation error."""
        payload = _make_register_payload(password="short")

        response = await client.post("/auth/register", json=payload)

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_with_invalid_email_returns_422(self, client: AsyncClient):
        """An invalid email format triggers a 422 validation error."""
        payload = _make_register_payload(email="not-an-email")

        response = await client.post("/auth/register", json=payload)

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_with_missing_fields_returns_422(self, client: AsyncClient):
        """A missing required field triggers a 422 validation error."""
        payload = {"email": VALID_EMAIL}  # missing password and full_name

        response = await client.post("/auth/register", json=payload)

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_with_extra_fields_returns_422(self, client: AsyncClient):
        """Extra (unknown) fields are forbidden (HTTP 422)."""
        payload = _make_register_payload()
        payload["is_admin"] = True

        response = await client.post("/auth/register", json=payload)

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_conflict_returns_409(
        self, mock_auth_service: MagicMock
    ):
        """When the email already exists, the route propagates the 409 Conflict."""
        mock_auth_service.register = AsyncMock(
            side_effect=ConflictException(
                message="A user with this email already exists.",
                error_code="EMAIL_ALREADY_EXISTS",
            )
        )

        app = _build_test_app(mock_auth_service, override_get_current_user=True)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = _make_register_payload()
            response = await ac.post("/auth/register", json=payload)
            assert response.status_code == 409


# =============================================================================
# POST /auth/login
# =============================================================================


class TestLoginRoute:
    """Tests for POST /auth/login."""

    @pytest.mark.asyncio
    async def test_login_returns_200_with_token_response(
        self, client: AsyncClient, mock_auth_service: MagicMock
    ):
        """A valid login request returns HTTP 200 with token + user data."""
        payload = _make_login_payload()

        response = await client.post("/auth/login", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert data["data"]["access_token"] == VALID_TOKEN
        assert data["data"]["token_type"] == "bearer"
        assert data["data"]["user"]["email"] == VALID_EMAIL

        mock_auth_service.login.assert_awaited_once()
        call_arg = mock_auth_service.login.call_args[0][0]
        assert call_arg.email == VALID_EMAIL
        assert call_arg.password == VALID_PASSWORD

    @pytest.mark.asyncio
    async def test_login_invalid_credentials_returns_401(
        self, mock_auth_service: MagicMock
    ):
        """Invalid email or password returns HTTP 401."""
        mock_auth_service.login = AsyncMock(
            side_effect=UnauthorizedException(
                message="Invalid email or password.",
                error_code="INVALID_CREDENTIALS",
            )
        )

        app = _build_test_app(mock_auth_service, override_get_current_user=True)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = _make_login_payload()
            response = await ac.post("/auth/login", json=payload)
            assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_with_empty_email_returns_422(self, client: AsyncClient):
        """An empty email triggers a 422 validation error."""
        payload = _make_login_payload(email="")

        response = await client.post("/auth/login", json=payload)

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_login_with_missing_fields_returns_422(self, client: AsyncClient):
        """Missing required fields trigger a 422 validation error."""
        payload = {"email": VALID_EMAIL}  # missing password

        response = await client.post("/auth/login", json=payload)

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_login_with_extra_fields_returns_422(self, client: AsyncClient):
        """Extra (unknown) fields are forbidden (HTTP 422)."""
        payload = _make_login_payload()
        payload["remember_me"] = True

        response = await client.post("/auth/login", json=payload)

        assert response.status_code == 422


# =============================================================================
# GET /auth/me (Protected Route — with get_current_user overridden)
# =============================================================================


class TestGetMeRoute:
    """Tests for GET /auth/me with a valid authenticated user (mocked dependency)."""

    @pytest.mark.asyncio
    async def test_get_me_returns_200_with_user_data(self, client: AsyncClient):
        """A request with a valid token returns HTTP 200 with user profile."""
        response = await client.get("/auth/me", headers={"Authorization": "Bearer mock-token"})

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert data["data"]["email"] == VALID_EMAIL
        assert data["data"]["full_name"] == VALID_NAME
        assert data["data"]["id"] == str(VALID_USER_UUID)

    @pytest.mark.asyncio
    async def test_get_me_response_excludes_sensitive_fields(self, client: AsyncClient):
        """The /me response must NOT include hashed_password or internal fields."""
        response = await client.get("/auth/me", headers={"Authorization": "Bearer mock-token"})

        data = response.json()
        user_data = data["data"]
        assert "hashed_password" not in user_data
        assert "password" not in user_data


# =============================================================================
# GET /auth/me — Token Validation (real get_current_user dependency)
# =============================================================================


class TestGetMeTokenValidation:
    """Tests for GET /auth/me that exercise the real get_current_user dependency.

    These tests verify the JWT validation logic in auth/dependencies.py
    (missing header, malformed token, empty token).
    """

    @pytest.mark.asyncio
    async def test_get_me_without_auth_header_returns_401(
        self, client_no_auth_override: AsyncClient
    ):
        """A request with no Authorization header returns HTTP 401."""
        response = await client_no_auth_override.get("/auth/me")

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_me_with_malformed_token_returns_401(
        self, client_no_auth_override: AsyncClient
    ):
        """A request with a malformed JWT (not 3 segments) returns HTTP 401."""
        # "Bearer " with only a space is not a valid token format
        response = await client_no_auth_override.get(
            "/auth/me",
            headers={"Authorization": "Bearer "},
        )

        assert response.status_code == 401