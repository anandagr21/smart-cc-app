"""
Module: backend.api.v1.auth
Responsibility: HTTP interface for user authentication.

Architectural Boundaries:
- Handles registration, login, and current-user endpoints.
- Thin route handlers only — delegates all logic to AuthService.
- No business logic, no DB access, no password hashing here.
"""

from fastapi import APIRouter, Depends, status, Request

from api.deps import get_user_repo
from auth.dependencies import get_current_user
from auth.schemas import (
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
    GoogleLoginRequest,
    RefreshTokenRequest,
)
from auth.service import AuthService
from repositories.user_repository import UserRepository
from schemas.common import SingleResponse
from core.config import get_settings
from core.rate_limit import limiter

settings = get_settings()

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ---- Dependency Providers ----


async def _get_auth_service(user_repo: UserRepository = Depends(get_user_repo)) -> AuthService:
    """Wire AuthService with UserRepository for route injection."""
    return AuthService(user_repo=user_repo)


# ---- Public Routes ----


@router.post(
    "/register",
    response_model=SingleResponse[TokenResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
@limiter.limit(settings.rate_limit_register)
async def register(
    request: Request,
    payload: UserRegisterRequest,
    auth_service: AuthService = Depends(_get_auth_service),
) -> dict:
    """Create a new user account and return an access token.

    The password must be at least 8 characters.
    Email must be unique — a 409 Conflict is returned if already registered.
    """
    result = await auth_service.register(payload)
    return {"data": result}


@router.post(
    "/login",
    response_model=SingleResponse[TokenResponse],
    status_code=status.HTTP_200_OK,
    summary="Log in with email and password",
)
@limiter.limit(settings.rate_limit_login)
async def login(
    request: Request,
    payload: UserLoginRequest,
    auth_service: AuthService = Depends(_get_auth_service),
) -> dict:
    """Authenticate with email and password, return an access token.

    Returns 401 Unauthorized if credentials are invalid.
    """
    result = await auth_service.login(payload)
    return {"data": result}


@router.post(
    "/google",
    response_model=SingleResponse[TokenResponse],
    status_code=status.HTTP_200_OK,
    summary="Log in or register with Google",
)
@limiter.limit(settings.rate_limit_login)
async def google_login(
    request: Request,
    payload: GoogleLoginRequest,
    auth_service: AuthService = Depends(_get_auth_service),
) -> dict:
    """Authenticate using a Google ID token from the client.

    If the user does not exist, they are automatically registered.
    Returns a JWT access token.
    """
    result = await auth_service.google_login(payload.id_token)
    return {"data": result}


# ---- Protected Routes ----


@router.get(
    "/me",
    response_model=SingleResponse[UserResponse],
    status_code=status.HTTP_200_OK,
    summary="Get the current authenticated user",
)
async def get_me(
    current_user: UserResponse = Depends(get_current_user),
) -> dict:
    """Return the profile of the currently authenticated user.

    Requires a valid Bearer token in the Authorization header.
    """
    return {"data": current_user}


@router.post(
    "/refresh",
    response_model=SingleResponse[TokenResponse],
    status_code=status.HTTP_200_OK,
    summary="Refresh access token using a refresh token",
)
@limiter.limit(settings.rate_limit_refresh)
async def rotate_token(
    request: Request,
    payload: RefreshTokenRequest,
    auth_service: AuthService = Depends(_get_auth_service),
) -> dict:
    """Exchange a refresh token for a new access + refresh token pair.

    The old refresh token is invalidated (single-use rotation).
    Returns a new access token and a new refresh token.
    If a previously-used refresh token is replayed, the entire token
    family is revoked for security.
    """
    result = await auth_service.refresh_token(payload.refresh_token)
    return {"data": result}


@router.patch(
    "/me/terms",
    response_model=SingleResponse[UserResponse],
    status_code=status.HTTP_200_OK,
    summary="Accept Terms and Conditions",
)
async def accept_terms(
    current_user: UserResponse = Depends(get_current_user),
    auth_service: AuthService = Depends(_get_auth_service),
) -> dict:
    """Mark the user as having accepted the terms and conditions."""
    result = await auth_service.accept_terms(current_user.id)
    return {"data": result}