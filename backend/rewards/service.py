"""Module: backend.rewards.service
Responsibility: Orchestrates reward rule workflows — validation, normalization, and persistence.

Architectural Boundaries:
- Orchestration only — delegates to validators, normalizers, and repository.
- MUST NOT execute raw SQL queries (delegates to repository).
- MUST NOT calculate rewards or depend on the reward engine.
- MUST NOT contain HTTP logic.
- Injects AsyncSession via constructor (dependency injection).
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from rewards.constants import RewardRuleType
from rewards.exceptions import RewardRuleNotFoundException
from rewards.schemas import (
    RewardRuleCreate,
    RewardRuleResponse,
    RewardRuleUpdate,
)
from rewards.models import RewardRule
from rewards.normalizers import normalize_rule_config, normalize_rule_name, normalize_rule_priority
from rewards.validators import validate_rule_schema, validate_no_duplicate_rule
from rewards.repository import (
    create_rule as repo_create_rule,
    get_rule_by_id,
    get_rule_by_id_or_raise,
    get_rules_by_card,
    get_active_rules,
    deactivate_rule as repo_deactivate_rule,
    update_rule as repo_update_rule,
    delete_rule as repo_delete_rule,
)


class RewardRuleService:
    """Service for managing reward rule definitions.

    Coordinates the full lifecycle of a reward rule:
    validate → normalize → persist.
    Does NOT compute rewards — that's the engine's job.
    """

    def __init__(self, session: AsyncSession) -> None:
        """Initialize with a database session (DI via FastAPI Depends).

        Args:
            session: An active AsyncSession for the request scope.
        """
        self._session = session

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def create_rule(self, schema: RewardRuleCreate) -> RewardRuleResponse:
        """Validate, normalize, and persist a new reward rule.

        Orchestration steps:
        1. Validate the schema (rule_type, reward_rate, etc.).
        2. Normalize the rule_config (fill defaults, coerce types).
        3. Normalize rule_name and priority.
        4. Check for duplicate rules on the same card.
        5. Persist via repository.

        Args:
            schema: The validated Pydantic creation schema.

        Returns:
            RewardRuleResponse of the newly created rule.

        Raises:
            DuplicateRuleError: If an identical rule already exists for the card.
            InvalidRuleConfigError: If the rule_config fails validation.
        """
        rule_type = RewardRuleType(schema.rule_type)

        # Step 1: Validate the rule schema.
        await validate_rule_schema(rule_type, schema.rule_config)

        # Step 2: Normalize the config.
        normalized_config = normalize_rule_config(rule_type, schema.rule_config)

        # Step 3: Normalize name and priority.
        rule_name = normalize_rule_name(schema.rule_name)
        priority = normalize_rule_priority(schema.priority)

        # Step 4: Check for duplicates.
        existing = await get_rules_by_card(self._session, schema.card_id)
        await validate_no_duplicate_rule(existing, rule_type, normalized_config)

        # Step 5: Persist.
        model = RewardRule(
            card_id=schema.card_id,
            rule_name=rule_name,
            rule_type=schema.rule_type,
            priority=priority,
            is_active=schema.is_active,
            rule_config=normalized_config,
        )
        persisted = await repo_create_rule(self._session, model)
        return RewardRuleResponse.model_validate(persisted)

    async def get_rule(self, rule_id: UUID) -> RewardRuleResponse:
        """Retrieve a single reward rule by id.

        Args:
            rule_id: The UUID of the rule.

        Returns:
            RewardRuleResponse.

        Raises:
            RewardRuleNotFoundException: If the rule does not exist.
        """
        rule = await get_rule_by_id_or_raise(self._session, rule_id)
        return RewardRuleResponse.model_validate(rule)

    async def get_card_rules(self, card_id: str) -> list[RewardRuleResponse]:
        """Retrieve all reward rules for a card, sorted by priority.

        Args:
            card_id: The card identifier.

        Returns:
            A list of RewardRuleResponse objects.
        """
        rules = await get_rules_by_card(self._session, card_id)
        return [RewardRuleResponse.model_validate(r) for r in rules]

    async def get_card_active_rules(self, card_id: str) -> list[RewardRuleResponse]:
        """Retrieve only active reward rules for a card, sorted by priority.

        Args:
            card_id: The card identifier.

        Returns:
            A list of active RewardRuleResponse objects.
        """
        rules = await get_active_rules(self._session, card_id)
        return [RewardRuleResponse.model_validate(r) for r in rules]

    async def update_rule(
        self, rule_id: UUID, schema: RewardRuleUpdate
    ) -> RewardRuleResponse:
        """Partially update a reward rule with normalization.

        If rule_config is provided, it is validated and normalized.
        If rule_name is provided, it is normalized.
        If priority is provided, it is normalized.

        Args:
            rule_id: The UUID of the rule to update.
            schema: The Pydantic update schema (all fields optional).

        Returns:
            The updated RewardRuleResponse.

        Raises:
            RewardRuleNotFoundException: If the rule does not exist.
            InvalidRuleConfigError: If the new rule_config fails validation.
        """
        # Fetch existing to access current rule_type for validation.
        existing = await get_rule_by_id_or_raise(self._session, rule_id)

        updates: dict = schema.model_dump(exclude_unset=True)

        if "rule_config" in updates:
            rule_type = RewardRuleType(existing.rule_type)
            await validate_rule_schema(rule_type, updates["rule_config"])
            updates["rule_config"] = normalize_rule_config(
                rule_type, updates["rule_config"]
            )

        if "rule_name" in updates:
            updates["rule_name"] = normalize_rule_name(updates["rule_name"])

        if "priority" in updates:
            updates["priority"] = normalize_rule_priority(updates["priority"])

        updated = await repo_update_rule(self._session, rule_id, updates)
        return RewardRuleResponse.model_validate(updated)

    async def deactivate_rule(self, rule_id: UUID) -> RewardRuleResponse:
        """Deactivate a rule (set is_active=False).

        Args:
            rule_id: The UUID of the rule to deactivate.

        Returns:
            The deactivated RewardRuleResponse.

        Raises:
            RewardRuleNotFoundException: If the rule does not exist.
        """
        rule = await repo_deactivate_rule(self._session, rule_id)
        return RewardRuleResponse.model_validate(rule)

    async def delete_rule(self, rule_id: UUID) -> None:
        """Delete a reward rule permanently.

        Args:
            rule_id: The UUID of the rule to delete.

        Raises:
            RewardRuleNotFoundException: If the rule does not exist.
        """
        await repo_delete_rule(self._session, rule_id)