"""
Module: backend.auth.service
Responsibility: Orchestrates authentication workflows — registration, login, user retrieval.

Architectural Boundaries:
- Orchestrates between auth.security (hashing/tokens) and repositories (persistence).
- Never accesses the database directly — always via UserRepository.
- Never hashes passwords or creates tokens directly — delegates to auth.security.
"""

from uuid import UUID

from auth.schemas import TokenResponse, UserLoginRequest, UserRegisterRequest, UserResponse
from auth.security import create_access_token, hash_password, verify_password
from core.exceptions import ConflictException, UnauthorizedException
from repositories.user_repository import UserRepository
from google.oauth2 import id_token
from google.auth.transport import requests
from core.config import get_settings


class AuthService:
    """Orchestrates user authentication workflows.

    Wires together password hashing, JWT creation, and user persistence.
    Stateless — all state lives in the repository layer.
    """

    def __init__(self, user_repo: UserRepository):
        self._user_repo = user_repo

    async def register(self, request: UserRegisterRequest) -> TokenResponse:
        """Register a new user and return an access token.

        Steps:
        1. Check if email already exists → 409 Conflict
        2. Hash the plaintext password
        3. Persist the user via UserRepository
        4. Generate and return a JWT access token

        Raises:
            ConflictException: If email is already registered.
        """
        # Check uniqueness
        existing = await self._user_repo.get_by_email(request.email)
        if existing is not None:
            raise ConflictException(
                message="A user with this email already exists.",
                code="EMAIL_ALREADY_EXISTS",
            )

        # Hash password and persist
        hashed = hash_password(request.password)
        user = await self._user_repo.create({
            "email": request.email,
            "hashed_password": hashed,
            "full_name": request.full_name,
        })

        # Issue token
        token = create_access_token(user.id)
        return TokenResponse(
            access_token=token,
            user=UserResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                role=user.role,
                terms_accepted=user.terms_accepted,
            ),
        )

    async def login(self, request: UserLoginRequest) -> TokenResponse:
        """Authenticate an existing user and return an access token.

        Steps:
        1. Look up user by email
        2. Verify password against stored hash
        3. Generate and return a JWT access token

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

        token = create_access_token(user.id)
        return TokenResponse(
            access_token=token,
            user=UserResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                role=user.role,
                terms_accepted=user.terms_accepted,
            ),
        )

    async def google_login(self, id_token_str: str) -> TokenResponse:
        """Authenticate using a Google ID token.

        Verifies the token against all configured Google client IDs
        (iOS, Android, web) since the audience claim varies by platform.
        Links existing email-registered accounts to Google automatically.
        """
        settings = get_settings()

        # Build audience list: all configured client IDs per platform
        audiences = settings.google_client_ids
        if not audiences:
            from core.exceptions import ConfigurationException
            raise ConfigurationException(
                message="No Google client IDs configured. Set GOOGLE_CLIENT_IDS_RAW or GOOGLE_CLIENT_ID.",
                code="GOOGLE_CONFIG_MISSING",
            )

        try:
            # verify_token supports a list of valid audiences, unlike verify_oauth2_token
            idinfo = id_token.verify_token(
                id_token_str,
                requests.Request(),
                audience=audiences[0] if len(audiences) == 1 else audiences,
                clock_skew_in_seconds=30,
            )
            # Explicit issuer check for defense-in-depth
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
            # If user exists but isn't linked to Google, link them
            if user.google_id != google_id:
                update_data: dict = {"google_id": google_id}
                # Only change auth_provider if the user was previously email-only
                if user.auth_provider == "email":
                    update_data["auth_provider"] = "google"
                user = await self._user_repo.update(user.id, update_data)
        else:
            # Create a new user since they don't exist
            user = await self._user_repo.create({
                "email": email,
                "hashed_password": None,
                "full_name": name,
                "auth_provider": "google",
                "google_id": google_id,
            })

        token = create_access_token(user.id)
        return TokenResponse(
            access_token=token,
            user=UserResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                role=user.role,
                terms_accepted=user.terms_accepted,
            ),
        )

    async def accept_terms(self, user_id: UUID) -> UserResponse:
        """Mark the user as having accepted the terms and conditions."""
        user = await self._user_repo.update(user_id, {"terms_accepted": True})
        return UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            terms_accepted=user.terms_accepted,
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
        )