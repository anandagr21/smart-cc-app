"""
Module: backend.merchants.repository
Responsibility: Database access abstraction for Merchant entities.

Architectural Boundaries:
- Handles ALL database queries for merchants and merchant aliases.
- MUST NOT contain business logic, normalization, or categorization.
- Returns domain models to the service layer.
- Inherits base CRUD from BaseRepository; extends with domain-specific queries.
"""

from __future__ import annotations

from typing import Sequence
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.exceptions import NotFoundException
from merchants.exceptions import MerchantAlreadyExistsException
from merchants.models import Merchant as MerchantModel
from merchants.models import MerchantAlias as AliasModel
from repositories.base import BaseRepository


class MerchantRepository(BaseRepository[MerchantModel, dict, dict]):
    """Repository for canonical merchant identities.

    Handles CRUD for Merchant entities and domain-specific queries
    for normalization/matching workflows (canonical lookup, alias search, etc.).
    """

    def __init__(self, session: AsyncSession):
        super().__init__(session, MerchantModel)

    async def get_by_canonical_name(self, canonical_name: str) -> MerchantModel | None:
        """Look up a merchant by its exact canonical name.

        Returns None if no match exists — does NOT raise NotFoundException.
        This is intentional so the service layer can decide whether to create
        or return existing.
        """
        result = await self.session.execute(
            select(MerchantModel).where(
                MerchantModel.canonical_name == canonical_name
            )
        )
        return result.scalar_one_or_none()

    async def create(self, create_data: dict) -> MerchantModel:
        """Create a merchant, guarding against duplicate canonical names.

        Raises MerchantExistsException if canonical_name already exists.
        """
        existing = await self.get_by_canonical_name(
            create_data.get("canonical_name", "")
        )
        if existing is not None:
            raise MerchantAlreadyExistsException(
                canonical_name=create_data.get("canonical_name", "")
            )

        return await super().create(create_data)

    async def get_by_id_with_aliases(self, merchant_id: UUID) -> MerchantModel:
        """Fetch a merchant with its aliases eagerly loaded.

        Uses selectinload to avoid N+1 queries when accessing merchant.aliases
        in response serialization.
        """
        result = await self.session.execute(
            select(MerchantModel)
            .where(MerchantModel.id == merchant_id)
            .options(selectinload(MerchantModel.aliases))
        )
        entity = result.scalar_one_or_none()
        if entity is None:
            raise NotFoundException(
                message=f"Merchant with id '{merchant_id}' not found.",
                error_code="MERCHANT_NOT_FOUND",
            )
        return entity

    async def search_by_alias(
        self, normalized_alias: str, *, include_inactive: bool = False
    ) -> MerchantModel | None:
        """Find a merchant whose alias matches the given normalized alias.

        Joins through MerchantAlias to find the parent merchant.
        """
        query = select(AliasModel).where(
            AliasModel.normalized_name == normalized_alias
        )
        if not include_inactive:
            query = query.where(AliasModel.is_active == True)

        result = await self.session.execute(query)
        alias = result.scalar_one_or_none()
        if alias is None:
            return None

        # Fetch the parent merchant with aliases loaded
        return await self.get_by_id_with_aliases(alias.merchant_id)

    async def search_normalized(
        self, canonical_name: str, *, include_inactive: bool = False
    ) -> MerchantModel | None:
        """Find a merchant by canonical name, with optional active-only filter."""
        query = select(MerchantModel).where(
            MerchantModel.canonical_name == canonical_name
        )
        if not include_inactive:
            query = query.where(MerchantModel.is_active == True)

        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def search_by_tokens(
        self,
        tokens: list[str],
        *,
        include_inactive: bool = False,
        limit: int = 10,
    ) -> Sequence[MerchantModel]:
        """Find merchants whose normalized_tokens overlap with the given tokens.

        Uses PostgreSQL JSONB ?| operator for array overlap.
        In SQLAlchemy/SQLModel, we use the .any() method on the ARRAY column,
        but since normalized_tokens is a JSON column, we use JSONB containment.
        """
        # Build a query that matches any merchant whose tokens intersect
        # with the query tokens. We construct this as a series of OR
        # conditions: token_0 ILIKE ANY(tokens) OR token_1 ILIKE ANY(tokens) ...
        # For simplicity and determinism, we use JSONB overlap via raw SQL.
        query = select(MerchantModel)

        if not include_inactive:
            query = query.where(MerchantModel.is_active == True)

        # Filter: at least one of the query tokens matches one of the stored tokens.
        # Using PostgreSQL JSONB containment operator ?|
        conditions = []
        for token in tokens:
            conditions.append(
                func.jsonb_exists(
                    MerchantModel.normalized_tokens,
                    token,
                )
            )
        if conditions:
            from sqlalchemy import or_

            query = query.where(or_(*conditions))

        query = query.order_by(MerchantModel.canonical_name).limit(limit)
        result = await self.session.execute(
            query.options(selectinload(MerchantModel.aliases))
        )
        return result.scalars().all()


class AliasRepository:
    """Repository for merchant aliases (alternate name mappings).

    NOTE: This does NOT inherit from BaseRepository because AliasModel
    has a different shape (composite index, foreign key to merchant).
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        merchant_id: UUID,
        raw_name: str,
        normalized_name: str,
        source: str = "manual",
    ) -> AliasModel:
        """Register a new alias for a merchant.

        Args:
            merchant_id: The parent merchant's UUID.
            raw_name: Original raw name (e.g., "DOMINOS PIZZA").
            normalized_name: Normalized form of the alias.
            source: Origin of the alias (e.g., "manual", "import", "statement").
        """
        alias = AliasModel(
            merchant_id=merchant_id,
            raw_name=raw_name,
            normalized_name=normalized_name,
            source=source,
        )
        self.session.add(alias)
        await self.session.flush()
        await self.session.refresh(alias)
        return alias

    async def get_by_merchant_id(
        self, merchant_id: UUID, *, include_inactive: bool = False
    ) -> Sequence[AliasModel]:
        """List all aliases for a given merchant."""
        query = select(AliasModel).where(AliasModel.merchant_id == merchant_id)
        if not include_inactive:
            query = query.where(AliasModel.is_active == True)
        query = query.order_by(AliasModel.created_at.desc())
        result = await self.session.execute(query)
        return result.scalars().all()

    async def deactivate(self, alias_id: UUID) -> AliasModel:
        """Soft-delete an alias."""
        result = await self.session.execute(
            select(AliasModel).where(AliasModel.id == alias_id)
        )
        entity = result.scalar_one_or_none()
        if entity is None:
            raise NotFoundException(
                message=f"Alias with id '{alias_id}' not found.",
                error_code="ALIAS_NOT_FOUND",
            )
        entity.is_active = False
        self.session.add(entity)
        await self.session.flush()
        await self.session.refresh(entity)
        return entity