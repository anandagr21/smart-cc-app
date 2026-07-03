"""
Module: backend.auth.service
Responsibility: Orchestrates authentication workflows — registration, login, token refresh, user retrieval.

Architectural Boundaries:
- Orchestrates between auth.security (hashing/tokens) and repositories (persistence).
- Never accesses the database directly — always via UserRepository.
- Never hashes passwords or creates tokens directly — delegates to auth.security.

Token Rotation:
- Refresh tokens follow a single-use rotation pattern with reuse detection.
- Each refresh token belongs to a `token_family`. When used, it's marked used
  and a new token is issued in the same family.
- If a previously-used refresh token is replayed, the ENTIRE family is revoked
  (indicates token theft).
"""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.schemas import TokenResponse, UserLoginRequest, UserRegisterRequest, UserResponse
from auth.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)
from core.exceptions import ConflictException, UnauthorizedException
from models.refresh_token import RefreshToken
from repositories.user_repository import UserRepository
from google.oauth2 import id_token
from google.auth.transport import requests
from core.config import get_settings


class AuthService:
    """Orchestrates user authentication workflows.

    Wires together password hashing, JWT creation, token rotation, and user persistence.
    Stateless — all state lives in the repository layer.
    """

    def __init__(self, user_repo: UserRepository):
        self._user_repo = user_repo

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _store_refresh_token(
        self, user_id: UUID, jti: str, token_family: str
    ) -> None:
        """Persist a new refresh token record in the database."""
        settings = get_settings()
        record = RefreshToken(
            user_id=user_id,
            token_family=token_family,
            jti=jti,
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
        )
        self._user_repo.session.add(record)
        await self._user_repo.session.flush()

    async def _issue_tokens(self, user) -> TokenResponse:
        """Create access + refresh tokens and persist the refresh token record.

        Returns a TokenResponse with both tokens and the user profile.
        """
        access_token = create_access_token(user.id)
        refresh_token_str, jti, family = create_refresh_token(user.id)

        await self._store_refresh_token(user.id, jti, family)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token_str,
            user=UserResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                role=user.role,
                terms_accepted=user.terms_accepted,
                is_premium=user.is_premium,
            ),
        )

    # ------------------------------------------------------------------
    # Registration & Login
    # ------------------------------------------------------------------

    async def register(self, request: UserRegisterRequest) -> TokenResponse:
        """Register a new user and return access + refresh tokens.

        Steps:
        1. Check if email already exists → 409 Conflict
        2. Hash the plaintext password
        3. Persist the user via UserRepository
        4. Issue access + refresh tokens

        Raises:
            ConflictException: If email is already registered.
        """
        existing = await self._user_repo.get_by_email(request.email)
        if existing is not None:
            raise ConflictException(
                message="A user with this email already exists.",
                code="EMAIL_ALREADY_EXISTS",
            )

        hashed = hash_password(request.password)
        user = await self._user_repo.create({
            "email": request.email,
            "hashed_password": hashed,
            "full_name": request.full_name,
        })

        return await self._issue_tokens(user)

    async def login(self, request: UserLoginRequest) -> TokenResponse:
        """Authenticate an existing user and return access + refresh tokens.

        Steps:
        1. Look up user by email
        2. Verify password against stored hash
        3. Issue access + refresh tokens

        Raises:
            UnauthorizedException: If email doesn't exist or password doesn't match.
        """
        user = await self._user_repo.get_by_email(request.email)
        if user is None:
            raise UnauthorizedException(
                message="Invalid email or password.",
                code="INVALID_CREDENTIALS",
            )

        if not verify_password(request.password, user.hashed_password):
            if user.auth_provider == "google":
                raise UnauthorizedException(
                    message="This account uses Google Sign-In. Please sign in with Google.",
                    code="GOOGLE_ACCOUNT",
                )
            raise UnauthorizedException(
                message="Invalid email or password.",
                code="INVALID_CREDENTIALS",
            )

        return await self._issue_tokens(user)

    async def google_login(self, id_token_str: str) -> TokenResponse:
        """Authenticate using a Google ID token and return access + refresh tokens.

        Verifies the token against all configured Google client IDs
        (iOS, Android, web) since the audience claim varies by platform.
        Links existing email-registered accounts to Google automatically.
        """
        settings = get_settings()

        audiences = settings.google_client_ids
        if not audiences:
            from core.exceptions import ConfigurationException
            raise ConfigurationException(
                message="No Google client IDs configured. Set GOOGLE_CLIENT_IDS_RAW or GOOGLE_CLIENT_ID.",
                code="GOOGLE_CONFIG_MISSING",
            )

        try:
            idinfo = id_token.verify_token(
                id_token_str,
                requests.Request(),
                audience=audiences[0] if len(audiences) == 1 else audiences,
                clock_skew_in_seconds=30,
            )
            if idinfo.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
                raise ValueError("Invalid issuer")
            email = idinfo["email"]
            name = idinfo.get("name", email.split("@")[0])
            google_id = idinfo["sub"]
        except ValueError:
            raise UnauthorizedException(
                message="Invalid Google ID token.",
                code="INVALID_TOKEN",
            )

        user = await self._user_repo.get_by_email(email)

        if user:
            if user.google_id != google_id:
                update_data: dict = {"google_id": google_id}
                if user.auth_provider == "email":
                    update_data["auth_provider"] = "google"
                user = await self._user_repo.update(user.id, update_data)
        else:
            user = await self._user_repo.create({
                "email": email,
                "hashed_password": None,
                "full_name": name,
                "auth_provider": "google",
                "google_id": google_id,
            })

        return await self._issue_tokens(user)

    # ------------------------------------------------------------------
    # Token Refresh (with rotation + reuse detection)
    # ------------------------------------------------------------------

    async def refresh_token(self, refresh_token_str: str) -> TokenResponse:
        """Exchange a refresh token for a new access + refresh token pair.

        Rotation & Reuse Detection:
        1. Decode the refresh JWT to extract jti, family, sub.
        2. Look up the token record by jti in the database.
        3. If not found → reject (unknown or already revoked).
        4. If is_used=True → TOKEN FAMILY COMPROMISED.
           Delete all tokens in the family (revoke the entire chain).
        5. If is_used=False → mark this token as used, issue a new
           refresh token in the same family, and return new tokens.

        This ensures that if an attacker steals a refresh token and the
        legitimate user has already used it, the attacker's replay will
        be detected and the entire session revoked.

        Raises:
            UnauthorizedException: If the token is invalid, expired, or reused.
        """
        import jwt as pyjwt
        import logging
        logger = logging.getLogger(__name__)

        # 1. Decode the refresh JWT
        try:
            payload = decode_refresh_token(refresh_token_str)
        except pyjwt.ExpiredSignatureError:
            raise UnauthorizedException(
                message="Refresh token has expired. Please log in again.",
                code="REFRESH_TOKEN_EXPIRED",
            )
        except pyjwt.InvalidTokenError:
            raise UnauthorizedException(
                message="Invalid refresh token.",
                code="INVALID_REFRESH_TOKEN",
            )

        if payload.get("type") != "refresh":
            raise UnauthorizedException(
                message="Invalid token type. Expected a refresh token.",
                code="INVALID_REFRESH_TOKEN",
            )

        jti = payload.get("jti")
        family = payload.get("family")
        user_id_str = payload.get("sub")

        if not jti or not family or not user_id_str:
            raise UnauthorizedException(
                message="Refresh token is missing required claims.",
                code="INVALID_REFRESH_TOKEN",
            )

        try:
            user_id = UUID(user_id_str)
        except ValueError:
            raise UnauthorizedException(
                message="Refresh token contains an invalid user ID.",
                code="INVALID_REFRESH_TOKEN",
            )

        session: AsyncSession = self._user_repo.session

        # 2. Look up the token record by jti
        result = await session.execute(
            select(RefreshToken).where(RefreshToken.jti == jti)
        )
        token_record = result.scalar_one_or_none()

        # 3. Token not found — could be revoked or never existed
        if token_record is None:
            logger.warning(
                "Refresh attempt with unknown jti — possible replay of revoked family",
                extra={"jti": jti, "family": family, "user_id": str(user_id)},
            )
            raise UnauthorizedException(
                message="Refresh token not recognized. Please log in again.",
                code="REFRESH_TOKEN_REVOKED",
            )

        # 4. Reuse detected — token family compromised!
        if token_record.is_used:
            logger.critical(
                "Refresh token reuse detected — revoking entire token family!",
                extra={"jti": jti, "family": family, "user_id": str(user_id)},
            )
            # Revoke ALL tokens in the family
            await session.execute(
                delete(RefreshToken).where(RefreshToken.token_family == family)
            )
            await session.flush()
            raise UnauthorizedException(
                message="Security alert: Token reuse detected. All sessions have been revoked. Please log in again.",
                code="TOKEN_REUSE_DETECTED",
            )

        # 5. Check expiry (defense-in-depth — JWT also has exp, but DB record
        #    may outlive if clock skew or timezone issues)
        if token_record.expires_at and token_record.expires_at < datetime.now(timezone.utc):
            raise UnauthorizedException(
                message="Refresh token has expired. Please log in again.",
                code="REFRESH_TOKEN_EXPIRED",
            )

        # 6. Happy path — mark current token as used and rotate
        token_record.is_used = True
        session.add(token_record)
        await session.flush()

        # 7. Fetch the user
        user = await self._user_repo.get_by_id_or_raise(user_id)

        # 8. Issue new tokens in the same family (rotation)
        access_token = create_access_token(user.id)
        new_refresh_str, new_jti, _ = create_refresh_token(user.id, token_family=family)

        await self._store_refresh_token(user.id, new_jti, family)

        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_str,
            user=UserResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                role=user.role,
                terms_accepted=user.terms_accepted,
                is_premium=user.is_premium,
            ),
        )

    # ------------------------------------------------------------------
    # Profile
    # ------------------------------------------------------------------

    async def accept_terms(self, user_id: UUID) -> UserResponse:
        """Mark the user as having accepted the terms and conditions."""
        user = await self._user_repo.update(user_id, {"terms_accepted": True})
        return UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            terms_accepted=user.terms_accepted,
            is_premium=user.is_premium,
        )

    async def get_current_user(self, user_id: UUID) -> UserResponse:
        """Fetch the current authenticated user by ID.

        Raises:
            NotFoundException: If the user no longer exists (e.g., deleted).
        """
        user = await self._user_repo.get_by_id_or_raise(user_id)
        return UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            terms_accepted=user.terms_accepted,
            is_premium=user.is_premium,
        )
