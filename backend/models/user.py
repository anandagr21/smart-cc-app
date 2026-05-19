"""
Module: backend.models.user
Responsibility: Defines the database entity for a User.

Architectural Boundaries:
- Data persistence only — no business logic, no methods beyond field definitions.
- Uses SQLModel for both DB table definition and Pydantic validation.
"""

from datetime import datetime
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    """User entity stored in the 'users' table.

    Attributes:
        id: Auto-generated UUID primary key.
        email: Unique email used for login. Indexed for fast lookups.
        hashed_password: bcrypt hash of the user's password. Never exposed.
        full_name: User's display name.
        created_at: UTC timestamp of account creation.
        updated_at: UTC timestamp of last modification.
    """

    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(max_length=320, unique=True, index=True)
    hashed_password: str = Field(max_length=128)
    full_name: str = Field(max_length=200)
    created_at: datetime = Field(
        default_factory=datetime.utcnow
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )
