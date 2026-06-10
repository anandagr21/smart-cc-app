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
)
from auth.service import AuthService
from repositories.user_repository import UserRepository
from schemas.common import SingleResponse
from core.rate_limit import limiter

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
@limiter.limit("3/minute")
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
@limiter.limit("5/minute")
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
@limiter.limit("5/minute")
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