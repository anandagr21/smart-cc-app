"""Module: backend.rewards.repository
Responsibility: Database persistence for RewardRule entities.

Architectural Boundaries:
- DB access only — raw SQL / SQLModel queries.
- MUST NOT contain business logic, reward calculations, or ranking logic.
- MUST NOT call external services or AI providers.
- Injects AsyncSession via constructor (dependency injection).
"""

from __future__ import annotations

from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, update

from rewards.models import RewardRule
from rewards.exceptions import RewardRuleNotFoundException


async def create_rule(session: AsyncSession, rule: RewardRule) -> RewardRule:
    """Persist a new RewardRule.

    Args:
        session: The database session.
        rule: The RewardRule model instance to persist.

    Returns:
        The persisted RewardRule with generated id and timestamps.
    """
    session.add(rule)
    await session.flush()
    await session.refresh(rule)
    return rule


async def get_rule_by_id(session: AsyncSession, rule_id: UUID) -> RewardRule | None:
    """Retrieve a single RewardRule by its primary key.

    Args:
        session: The database session.
        rule_id: The UUID of the rule.

    Returns:
        The RewardRule if found, otherwise None.
    """
    result = await session.execute(
        select(RewardRule).where(RewardRule.id == rule_id)
    )
    return result.scalar_one_or_none()


async def get_rule_by_id_or_raise(session: AsyncSession, rule_id: UUID) -> RewardRule:
    """Retrieve a RewardRule by id, raising RewardRuleNotFoundException if missing.

    Args:
        session: The database session.
        rule_id: The UUID of the rule.

    Returns:
        The found RewardRule.

    Raises:
        RewardRuleNotFoundException: If the rule does not exist.
    """
    rule = await get_rule_by_id(session, rule_id)
    if rule is None:
        raise RewardRuleNotFoundException(rule_id=str(rule_id))
    return rule


async def get_rules_by_card(session: AsyncSession, card_id: str) -> list[RewardRule]:
    """Retrieve all RewardRules associated with a card, ordered by priority.

    Args:
        session: The database session.
        card_id: The card identifier (foreign key).

    Returns:
        A list of RewardRules sorted by priority ascending.
    """
    result = await session.execute(
        select(RewardRule)
        .where(RewardRule.card_id == card_id)
        .order_by(RewardRule.priority.asc())
    )
    return list(result.scalars().all())


async def get_active_rules(session: AsyncSession, card_id: str) -> list[RewardRule]:
    """Retrieve only active RewardRules for a card, ordered by priority.

    Args:
        session: The database session.
        card_id: The card identifier.

    Returns:
        A list of active RewardRules sorted by priority ascending.
    """
    result = await session.execute(
        select(RewardRule)
        .where(
            RewardRule.card_id == card_id,
            RewardRule.is_active.is_(True),
        )
        .order_by(RewardRule.priority.asc())
    )
    return list(result.scalars().all())


async def deactivate_rule(session: AsyncSession, rule_id: UUID) -> RewardRule:
    """Set is_active=False for a rule and return the updated instance.

    Args:
        session: The database session.
        rule_id: The UUID of the rule to deactivate.

    Returns:
        The deactivated RewardRule.

    Raises:
        RewardRuleNotFoundException: If the rule does not exist.
    """
    await session.execute(
        update(RewardRule)
        .where(RewardRule.id == rule_id)
        .values(is_active=False)
    )
    await session.flush()
    return await get_rule_by_id_or_raise(session, rule_id)


async def update_rule(
    session: AsyncSession, rule_id: UUID, updates: dict
) -> RewardRule:
    """Partial-update a RewardRule with the given field values.

    Args:
        session: The database session.
        rule_id: The UUID of the rule to update.
        updates: A dictionary of field names to new values.

    Returns:
        The updated RewardRule.

    Raises:
        RewardRuleNotFoundException: If the rule does not exist.
    """
    await session.execute(
        update(RewardRule)
        .where(RewardRule.id == rule_id)
        .values(**updates)
    )
    await session.flush()
    return await get_rule_by_id_or_raise(session, rule_id)


async def delete_rule(session: AsyncSession, rule_id: UUID) -> None:
    """Delete a RewardRule by id.

    Args:
        session: The database session.
        rule_id: The UUID of the rule to delete.

    Raises:
        RewardRuleNotFoundException: If the rule does not exist.
    """
    rule = await get_rule_by_id_or_raise(session, rule_id)
    await session.delete(rule)
    await session.flush()