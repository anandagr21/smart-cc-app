"""
Module: backend.core.config
Responsibility: Application configuration via environment variables.

Architectural Boundaries:
- Centralized configuration using pydantic-settings (Pydantic v2).
- All secrets, URLs, and environment-specific values read from env vars only.
- No hardcoded values — every setting has a sensible default or is required.

Decision: Using Pydantic v2's `BaseSettings` (from pydantic-settings) ensures
type-safe config with automatic env-var loading and validation at startup.
"""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

from core.constants import Environment


class Settings(BaseSettings):
    """Application-wide settings sourced from environment variables.

    All settings are loaded from environment variables or a `.env` file.
    Secrets (like DATABASE_URL) must NEVER be hardcoded — they must come from env.

    Usage:
        settings = get_settings()
        db_url = settings.database_url
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignore unknown env vars — safe with other services
    )

    # ---- Application ----
    app_name: str = "Smart CC API"
    app_version: str = "0.1.0"
    debug: bool = False
    environment: Environment = Environment.DEVELOPMENT

    # ---- Server ----
    host: str = "0.0.0.0"
    port: int = 8000

    # ---- Database ----
    # WARNING: Default credentials are for local dev only. Override via DATABASE_URL env var in production.
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/smart_cc"
    database_pool_size: int = 10
    database_max_overflow: int = 20
    database_pool_pre_ping: bool = True  # Verify connections before use — prevents stale pool errors

    # ---- Auth ----
    secret_key: str = "change-me-in-production-use-env-var"
    access_token_expire_minutes: int = 43200  # 30 days for smoother local dev
    google_client_id: str = ""
    google_client_ids_raw: str = ""  # Comma-separated list of all Google OAuth client IDs (web, iOS, Android)

    # ---- Logging ----
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    log_format: Literal["json", "text"] = "json"

    # ---- CORS ----
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:19006", "http://localhost:8081", "http://localhost:8082"]

    # ---- API ----
    api_v1_prefix: str = "/api/v1"

    # ---- AI Narrative Synthesis ----
    openai_api_key: str = ""
    openai_base_url: str = ""  # Useful for DeepSeek or other OpenAI-compatible APIs
    ai_narrative_model: str = "gpt-4o"
    ai_narrative_enabled: bool = True

    # ---- Card Intelligence Extraction ----
    card_intelligence_provider: str = "gemini"
    card_intelligence_model: str = "gemini-2.5-pro"

    # ---- Convenience Properties ----
    @property
    def google_client_ids(self) -> list[str]:
        """Return all configured Google OAuth client IDs.

        Combines `google_client_id` (legacy single client) and
        `google_client_ids_raw` (comma-separated list) into one deduplicated list.
        Google ID tokens have `aud` set to the platform-specific client ID,
        so all platform client IDs must be valid audiences.
        """
        ids: list[str] = []
        if self.google_client_ids_raw:
            ids.extend(cid.strip() for cid in self.google_client_ids_raw.split(",") if cid.strip())
        if self.google_client_id and self.google_client_id not in ids:
            ids.append(self.google_client_id)
        return ids

    @property
    def is_production(self) -> bool:
        """Return True if running in production."""
        return self.environment == Environment.PRODUCTION

    @property
    def is_development(self) -> bool:
        """Return True if running in development."""
        return self.environment == Environment.DEVELOPMENT

    @property
    def requires_secure_secret(self) -> bool:
        """Return True if running in a non-dev environment with default secret key.

        Used to warn or fail early if the secret key hasn't been changed in staging/production.
        """
        return not self.is_development and self.secret_key == "change-me-in-production-use-env-var"


@lru_cache()
def get_settings() -> Settings:
    """Return cached Settings singleton.

    Using lru_cache ensures settings are loaded once and reused across all
    dependency injections — avoids re-reading env vars on every request.
    """
    return Settings()