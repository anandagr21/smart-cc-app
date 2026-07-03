"""
Module: backend.models.refresh_token
Responsibility: Database entity for refresh tokens with rotation tracking.

Architectural Boundaries:
- Data persistence only — no business logic.
- Implements token-family tracking for reuse detection.
- Each token is single-use; rotation issues a new token in the same family.
"""

from datetime import datetime
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class RefreshToken(SQLModel, table=True):
    """Stores refresh tokens for the token-rotation pattern.

    Token Family Rotation:
    - Every refresh token belongs to a `token_family`.
    - When a refresh token is used, it's marked `is_used=True` and a new
      token is issued in the same family.
    - If a token that is already `is_used=True` is presented again, it
      means the token family has been compromised (replay attack). In that
      case, the ENTIRE family is revoked.

    Attributes:
        id: Auto-generated UUID primary key.
        user_id: FK to the owning user.
        token_family: Groups tokens in a rotation chain. A new family is
            created on login/register; subsequent rotations stay in the
            same family.
        jti: The JWT ID (jti claim) of the refresh token JWT itself.
            Used to look up this specific token during refresh.
        is_used: Whether this token has already been exchanged. Single-use
            enforcement — a used token being replayed triggers revocation.
        expires_at: UTC timestamp after which this token is invalid.
        created_at: UTC timestamp of token creation.
    """

    __tablename__ = "refresh_tokens"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    token_family: str = Field(index=True, max_length=64)
    jti: str = Field(unique=True, index=True, max_length=64)
    is_used: bool = Field(default=False)
    expires_at: datetime = Field()
    created_at: datetime = Field(default_factory=datetime.utcnow)
