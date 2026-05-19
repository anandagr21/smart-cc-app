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
from uuid import UUID

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


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash.

    Returns True if the password matches, False otherwise.
    """
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