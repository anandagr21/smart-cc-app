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
from uuid import UUID

settings = get_settings()

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ---- Dependency Providers ----


async def _get_auth_service(user_repo: UserRepository = Depends(get_user_repo)) -> AuthService:
    """Wire AuthService with UserRepository for route injection."""
    return AuthService(user_repo=user_repo)


# ---- Public Routes ----


def _resolve_device_label(request: Request) -> str | None:
    """Resolve device label with legacy fallback."""
    # ponytail: explicit X-Device-Label preferred ("Android 14" / "iOS 18.1" / "Web • Chrome"),
    # fallback parses User-Agent so old apps (no header) don't store NULL.
    dl = request.headers.get("x-device-label")
    if dl and dl.strip():
        return dl.strip()[:100]
    # legacy fallback — old app didn't send header
    ua = (request.headers.get("user-agent") or "").lower()
    if not ua:
        return None
    if "android" in ua:
        return "Android"
    if "iphone" in ua or "ipad" in ua or "ipod" in ua:
        return "iOS"
    if "expo" in ua:
        return "Web"
    if "chrome" in ua or "chromium" in ua:
        return "Web • Chrome"
    if "safari" in ua:
        return "Web • Safari"
    if "firefox" in ua or "fxios" in ua:
        return "Web • Firefox"
    if "edg" in ua:
        return "Web • Edge"
    return "Web"


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
    ip = request.client.host if request.client else None
    dl = _resolve_device_label(request)
    result = await auth_service.register(payload, ip_address=ip, device_label=dl)
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
    ip = request.client.host if request.client else None
    dl = _resolve_device_label(request)
    result = await auth_service.login(payload, ip_address=ip, device_label=dl)
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
    ip = request.client.host if request.client else None
    dl = _resolve_device_label(request)
    result = await auth_service.google_login(payload.id_token, ip_address=ip, device_label=dl)
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


# ---- Sessions (P0.0) ----


@router.get(
    "/sessions",
    status_code=status.HTTP_200_OK,
    summary="List active sessions for current user",
)
async def list_sessions(
    current_user: UserResponse = Depends(get_current_user),
    auth_service: AuthService = Depends(_get_auth_service),
) -> dict:
    rows = await auth_service.list_sessions(current_user.id)

    def _fmt(r):
        return {
            "id": str(r.id),
            "token_family": r.token_family,
            "ip_address": r.ip_address,
            "device_label": r.device_label or "Unknown device",  # ponytail: legacy NULL fallback for old sessions before header existed
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "last_active_at": r.last_active_at.isoformat() if r.last_active_at else None,
            "expires_at": r.expires_at.isoformat() if r.expires_at else None,
            "is_revoked": r.is_revoked,
        }

    return {"data": [_fmt(r) for r in rows]}


@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_200_OK,
    summary="Revoke a single session",
)
async def revoke_session(
    session_id: UUID,
    current_user: UserResponse = Depends(get_current_user),
    auth_service: AuthService = Depends(_get_auth_service),
) -> dict:
    await auth_service.revoke_session(current_user.id, session_id)
    return {"data": {"revoked": str(session_id)}}


@router.delete(
    "/sessions",
    status_code=status.HTTP_200_OK,
    summary="Revoke all sessions (logout everywhere)",
)
async def revoke_all_sessions(
    current_user: UserResponse = Depends(get_current_user),
    auth_service: AuthService = Depends(_get_auth_service),
) -> dict:
    # ponytail: path /auth/sessions without trailing slash handles "revoke all" — keep after /sessions/{id} so `{id}` doesn't greedily match "sessions"
    # FastAPI resolves literal before param, so /sessions is safe even when /sessions/{id} exists.
    count = await auth_service.revoke_all_sessions(current_user.id)
    return {"data": {"revoked_count": count}}


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Logout current session",
)
async def logout(
    current_user: UserResponse = Depends(get_current_user),
    auth_service: AuthService = Depends(_get_auth_service),
) -> dict:
    # ponytail: logout revokes the most recent active session for this user (1 device = 1 family at 50 users).
    # Upgrade to family-in-access-token claim when multi-device logout precision matters.
    rows = await auth_service.list_sessions(current_user.id)
    active = [r for r in rows if not r.is_revoked]
    family = active[0].token_family if active else None
    await auth_service.logout(current_user.id, token_family=family)
    return {"data": {"logged_out": True}}