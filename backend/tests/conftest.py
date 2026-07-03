"""
Module: backend.tests.conftest
Responsibility: Shared pytest fixtures for all test types (unit and integration).

Architectural Boundaries:
- Provides reusable test data, factories, and mocks.
- No real database connections — those go in integration-specific conftest.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from auth.dependencies import get_current_user
from auth.schemas import TokenResponse, UserResponse
from auth.service import AuthService
from repositories.user_repository import UserRepository


# ---- Test Data ----

VALID_USER_UUID = uuid.UUID("12345678-1234-5678-1234-567812345678")
VALID_USER_EMAIL = "test@example.com"
VALID_USER_NAME = "Test User"
VALID_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid_token_payload"
VALID_REFRESH_TOKEN = "eyJhbGciOiJIUzI1NiJ9.mock_refresh_token"


@pytest.fixture
def sample_user_response() -> UserResponse:
    """Return a sample UserResponse for test assertions."""
    return UserResponse(
        id=VALID_USER_UUID,
        email=VALID_USER_EMAIL,
        full_name=VALID_USER_NAME,
    )


@pytest.fixture
def sample_token_response(sample_user_response: UserResponse) -> TokenResponse:
    """Return a sample TokenResponse for test assertions."""
    return TokenResponse(
        access_token=VALID_TOKEN,
        refresh_token=VALID_REFRESH_TOKEN,
        user=sample_user_response,
    )


@pytest.fixture
def mock_user_repo() -> AsyncMock:
    """Return a mocked UserRepository with AsyncMock methods."""
    repo = AsyncMock(spec=UserRepository)
    return repo


@pytest.fixture
def mock_auth_service(mock_user_repo: AsyncMock, sample_token_response: TokenResponse, sample_user_response: UserResponse) -> MagicMock:
    """Return a mocked AuthService wired with the mock UserRepository."""
    service = MagicMock(spec=AuthService)
    service._user_repo = mock_user_repo
    service.register = AsyncMock(return_value=sample_token_response)
    service.login = AsyncMock(return_value=sample_token_response)
    service.refresh_token = AsyncMock(return_value=sample_token_response)
    service.get_current_user = AsyncMock(return_value=sample_user_response)
    return service


@pytest.fixture
def app_with_mocked_auth(
    mock_auth_service: MagicMock,
    mock_user_repo: AsyncMock,
    sample_user_response: UserResponse,
) -> FastAPI:
    """Build a FastAPI test app with the auth router and overridden dependencies."""
    from api.v1.auth import _get_auth_service, router
    from api.deps import get_user_repo
    from core.rate_limit import limiter

    app = FastAPI()
    app.state.limiter = limiter
    app.include_router(router)

    # Override auth service provider
    async def override_get_auth_service():
        return mock_auth_service

    app.dependency_overrides[_get_auth_service] = override_get_auth_service

    # Override current user for protected routes
    async def override_get_current_user():
        return sample_user_response

    app.dependency_overrides[get_current_user] = override_get_current_user

    # Override user repo
    async def override_get_user_repo():
        return mock_user_repo

    app.dependency_overrides[get_user_repo] = override_get_user_repo

    return app


@pytest.fixture
def client(app_with_mocked_auth: FastAPI) -> AsyncClient:
    """Return a synchronous httpx AsyncClient bound to the test app.

    This is a sync fixture because pytest-asyncio 1.x in STRICT mode
    requires explicit asyncio markers for async fixtures.
    Instead, tests use `async with client as ac:` within their async bodies.
    Alternatively, tests just call `await client.get(...)` since the
    fixture returns the client directly and we use asyncio_mode=auto.
    """
    transport = ASGITransport(app=app_with_mocked_auth)
    return AsyncClient(transport=transport, base_url="http://test")