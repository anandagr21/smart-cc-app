"""
Module: backend.repositories.user_repository
Responsibility: Database access abstraction for User entities.

Architectural Boundaries:
- Handles user CRUD. No business logic.
- Extends BaseRepository for standard CRUD operations.
- Adds domain-specific queries like get_by_email().
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFoundException
from models.user import User
from repositories.base import BaseRepository


class UserRepository(BaseRepository[User, dict, dict]):
    """Async repository for User entity persistence.

    Extends BaseRepository with User-specific queries.
    Create and Update schemas are typed as dict because user creation
    (password hashing) happens in the service layer, not via Pydantic schemas.
    """

    def __init__(self, session: AsyncSession):
        super().__init__(session, User)

    async def get_by_email(self, email: str) -> User | None:
        """Find a user by email. Returns None if not found.

        Unlike get_by_id(), this does NOT raise NotFoundException —
        callers decide how to handle missing users (e.g., registration check).
        """
        result = await self.session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def get_by_id_or_raise(self, user_id: UUID) -> User:
        """Fetch user by ID, raising NotFoundException if absent.

        Convenience wrapper for auth dependencies that need a guaranteed user.
        """
        return await self.get_by_id(user_id)