"""
Module: backend.auth.dependencies
Responsibility: FastAPI Depends() callables for JWT authentication.

Architectural Boundaries:
- Provides get_current_user dependency for protected routes.
- Extracts and validates JWT from the Authorization header.
- Delegates user lookups to AuthService (which delegates to UserRepository).
- No business logic — just token extraction, validation, and delegation.
"""

from uuid import UUID

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from api.deps import get_user_repo
from auth.schemas import UserResponse
from auth.security import decode_access_token
from auth.service import AuthService
from core.config import get_settings
from core.exceptions import UnauthorizedException
from repositories.user_repository import UserRepository

settings = get_settings()

# HTTPBearer extracts the "Authorization: Bearer <token>" header.
# Setting auto_error=False means we handle missing headers ourselves
# (returning a proper 401 with our error format instead of FastAPI's default).
_bearer_scheme = HTTPBearer(auto_error=False)


async def _get_auth_service(user_repo: UserRepository) -> AuthService:
    """Internal: wire AuthService with UserRepository."""
    return AuthService(user_repo=user_repo)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    user_repo: UserRepository = Depends(get_user_repo),
) -> UserResponse:
    """FastAPI dependency that extracts and validates the JWT, then returns the current user.

    Usage in routes:
        @router.get("/me")
        async def me(current_user: UserResponse = Depends(get_current_user)):
            return {"data": current_user}

    Raises:
        UnauthorizedException: If the Authorization header is missing,
            the token is expired/invalid, or the user no longer exists.
    """
    # 1. Check for missing header
    if credentials is None:
        raise UnauthorizedException(
            message="Missing Authorization header. Provide a Bearer token.",
            error_code="MISSING_TOKEN",
        )

    token = credentials.credentials

    # 2. Decode and verify the JWT
    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise UnauthorizedException(
            message="Access token has expired. Please log in again.",
            error_code="TOKEN_EXPIRED",
        )
    except jwt.InvalidTokenError:
        raise UnauthorizedException(
            message="Invalid access token.",
            error_code="INVALID_TOKEN",
        )

    # 3. Extract user ID from the token
    user_id_str = payload.get("sub")
    if user_id_str is None:
        raise UnauthorizedException(
            message="Token is missing the subject (sub) claim.",
            error_code="INVALID_TOKEN",
        )

    try:
        user_id = UUID(user_id_str)
    except ValueError:
        raise UnauthorizedException(
            message="Token contains an invalid user ID.",
            error_code="INVALID_TOKEN",
        )

    # 4. Fetch the user (raises NotFoundException → 401 via middleware)
    auth_service = await _get_auth_service(user_repo)
    return await auth_service.get_current_user(user_id)