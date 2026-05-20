"""
Alembic async migration environment.

Configured for SQLAlchemy async (asyncpg) with SQLModel metadata.
The database URL is read from application settings (from env vars),
NOT hardcoded — this is the production-safe approach.

Usage:
    cd backend
    alembic revision --autogenerate -m "description"
    alembic upgrade head
    alembic downgrade -1
"""

import asyncio
from logging.config import fileConfig
from typing import Any

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlmodel import SQLModel

from core.config import get_settings

# Alembic Config object
config = context.config

# Set up logging from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import all SQLModel models here so autogenerate can detect them.
from merchants.models import Merchant, MerchantAlias  # noqa: F401
from models.card import Card  # noqa: F401
from models.card_catalog import CardCatalog  # noqa: F401
from models.transaction import Transaction  # noqa: F401
from models.user import User  # noqa: F401
from models.user_card import UserCard  # noqa: F401
from rewards.models import RewardRule  # noqa: F401

# Target metadata for autogenerate — includes all SQLModel tables
target_metadata = SQLModel.metadata

# Override sqlalchemy.url from application settings (env vars)
# This avoids hardcoding credentials in alembic.ini
settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.database_url)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (generate SQL without connecting to DB).

    Useful for generating migration SQL scripts for review/CI.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Any) -> None:  # noqa: ANN401
    """Execute migrations within a given connection context."""
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in 'online' mode with async engine."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (connected to database)."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()