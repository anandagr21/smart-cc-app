"""
Module: backend.repositories.base
Responsibility: Generic async base repository with reusable CRUD operations.

Architectural Boundaries:
- Provides common database operations (get, list, create, update, delete).
- Concrete repositories inherit from this base and add domain-specific queries.
- Repository layer is the ONLY place where database access happens.
- Services never touch the database directly — they use repositories.

Decision: A generic base repository eliminates boilerplate across all entity
repositories. Concrete repos override/extend only when they need custom behavior.
All methods are async (project requirement) and accept an AsyncSession.
"""

from typing import Any, Generic, Sequence, TypeVar
from uuid import UUID

from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel

from core.exceptions import NotFoundException

# Generic type variable for SQLModel subclasses (DB entities)
ModelType = TypeVar("ModelType", bound=SQLModel)
# Generic type variable for Pydantic schemas (create/update payloads)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """Generic async repository providing standard CRUD operations.

    Concrete repositories should inherit and specify the model type and schemas:

        class CardRepository(BaseRepository[Card, CardCreate, CardUpdate]):
            def __init__(self, session: AsyncSession):
                super().__init__(session, Card)

            async def get_by_user_id(self, user_id: UUID) -> list[Card]:
                ...
    """

    def __init__(self, session: AsyncSession, model: type[ModelType]):
        """Initialize with a DB session and the entity model class.

        Args:
            session: Async SQLAlchemy session (injected via FastAPI Depends).
            model: The SQLModel class this repository manages.
        """
        self.session = session
        self.model = model

    async def get_by_id(self, id: UUID) -> ModelType:
        """Fetch a single entity by its primary key (UUID).

        Raises NotFoundException if the entity doesn't exist.
        """
        result = await self.session.execute(
            select(self.model).where(self.model.id == id)
        )
        entity = result.scalar_one_or_none()
        if entity is None:
            raise NotFoundException(
                message=f"{self.model.__name__} with id '{id}' not found.",
                code=f"{self.model.__name__.upper()}_NOT_FOUND",
            )
        return entity

    async def list(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
        order_by: Any = None,
        **filters: Any,
    ) -> tuple[Sequence[ModelType], int]:
        """Fetch a paginated list of entities.

        Args:
            skip: Number of records to skip (offset).
            limit: Maximum records to return.
            order_by: SQLAlchemy order_by clause (default: id descending).
            **filters: Simple equality filters (e.g., user_id=some_uuid).

        Returns:
            Tuple of (items, total_count) for pagination metadata.
        """
        query = select(self.model)

        # Apply simple equality filters
        for field_name, value in filters.items():
            if value is not None and hasattr(self.model, field_name):
                query = query.where(getattr(self.model, field_name) == value)

        # Count total before pagination
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        # Apply ordering and pagination
        if order_by is not None:
            query = query.order_by(order_by)
        else:
            query = query.order_by(self.model.id.desc())  # type: ignore[union-attr]

        query = query.offset(skip).limit(limit)
        result = await self.session.execute(query)
        items = result.scalars().all()

        return items, total

    async def create(self, create_schema: CreateSchemaType) -> ModelType:
        """Create a new entity from a Pydantic schema.

        Args:
            create_schema: Validated Pydantic model with creation fields.

        Returns:
            The newly created SQLModel entity (flushed to DB, not yet committed).
        """
        # Handle both Pydantic schemas and plain dicts
        if isinstance(create_schema, dict):
            entity = self.model(**create_schema)
        else:
            entity = self.model(**create_schema.model_dump())
        self.session.add(entity)
        await self.session.flush()
        await self.session.refresh(entity)
        return entity

    async def update(self, id: UUID, update_schema: UpdateSchemaType | dict) -> ModelType:
        """Update an existing entity with partial data.

        Only fields explicitly set in the schema are updated (partial update).
        Fields set to None are ignored.

        Args:
            id: UUID of the entity to update.
            update_schema: Pydantic model or dict with fields to update.

        Returns:
            The updated entity.

        Raises:
            NotFoundException if the entity doesn't exist.
        """
        entity = await self.get_by_id(id)
        
        if isinstance(update_schema, dict):
            update_data = update_schema
        else:
            update_data = update_schema.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if value is not None and hasattr(entity, field):
                setattr(entity, field, value)

        self.session.add(entity)
        await self.session.flush()
        await self.session.refresh(entity)
        return entity

    async def delete(self, id: UUID) -> None:
        """Delete an entity by its primary key.

        Raises NotFoundException if the entity doesn't exist.
        """
        entity = await self.get_by_id(id)
        await self.session.delete(entity)
        await self.session.flush()