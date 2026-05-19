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
            ),
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
        )