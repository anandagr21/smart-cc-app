"""
Module: backend.auth.security
Responsibility: Pure cryptographic utilities — password hashing and JWT management.

Architectural Boundaries:
- Pure functions only — no database access, no business logic, no I/O.
- Password hashing via bcrypt (passlib).
- JWT creation and verification via PyJWT (python-jose).
- All secrets and durations come from core.config — never hardcoded.
"""

from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import bcrypt
import jwt

from core.config import get_settings

settings = get_settings()

# ---- Password Hashing ----


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt.

    The salt is auto-generated and embedded in the returned string.
    The result is safe to store in the database.
    """
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str | None) -> bool:
    """Verify a plaintext password against a bcrypt hash.

    Returns True if the password matches, False otherwise.
    Returns False if hashed_password is None (Google-only accounts have no password).
    """
    if hashed_password is None:
        return False
    password_bytes = plain_password.encode("utf-8")
    hashed_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(password_bytes, hashed_bytes)


# ---- JWT Tokens ----


def create_access_token(user_id: UUID) -> str:
    """Create a signed JWT access token for the given user.

    The token includes:
    - sub: user UUID (subject claim)
    - exp: expiration timestamp
    - iat: issued-at timestamp
    - type: "access"

    Signed with HS256 using the configured SECRET_KEY.
    """
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
        "iat": now,
        "type": "access",
        "jti": str(uuid4()),  # Unique token ID for potential revocation
    }
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT access token.

    Returns the token payload as a dictionary.

    Raises:
        jwt.ExpiredSignatureError: If the token has expired.
        jwt.InvalidTokenError: If the token is invalid (bad signature, malformed, etc.).
    """
    return jwt.decode(token, settings.secret_key, algorithms=["HS256"])


def create_refresh_token(user_id: UUID, token_family: str | None = None) -> tuple[str, str]:
    """Create a signed JWT refresh token and return (encoded_token, jti, family).

    The refresh token includes:
    - sub: user UUID
    - exp: long expiration (default 30 days)
    - iat: issued-at timestamp
    - type: "refresh"
    - jti: unique token ID (used for single-use lookup in DB)
    - family: token family ID (groups tokens in a rotation chain)

    Returns:
        Tuple of (encoded_token, jti, token_family).
    """
    jti = str(uuid4())
    family = token_family or str(uuid4())
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "exp": now + timedelta(days=settings.refresh_token_expire_days),
        "iat": now,
        "type": "refresh",
        "jti": jti,
        "family": family,
    }
    token = jwt.encode(payload, settings.secret_key, algorithm="HS256")
    return token, jti, family


def decode_refresh_token(token: str) -> dict:
    """Decode and verify a refresh JWT.

    Returns the token payload as a dictionary.

    Raises:
        jwt.ExpiredSignatureError: If the token has expired.
        jwt.InvalidTokenError: If the token is invalid.
    """
    return jwt.decode(token, settings.secret_key, algorithms=["HS256"])