from datetime import date, datetime, timezone
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import Column, JSON

class PortfolioEvolutionSnapshot(SQLModel, table=True):
    """
    Stores longitudinal portfolio cognition metrics over time.
    Calculated periodically (e.g., monthly) or upon request to track
    how the user's wallet is evolving in terms of complexity, value, and redundancy.
    """
    __tablename__ = "portfolio_evolution_snapshots"  # type: ignore

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    
    # The month this snapshot represents (e.g., 2026-05-01)
    snapshot_date: date = Field(index=True)
    
    # Portfolio Metrics
    complexity_score: float = Field(default=0.0)
    value_density: float = Field(default=0.0)
    redundancy_score: float = Field(default=0.0)
    fee_efficiency_score: float = Field(default=0.0)
    strategic_alignment_score: float = Field(default=0.0)
    
    # A JSON string or field to store the generated narrative or top observation
    primary_narrative: str | None = Field(default=None)

    # Structured Narrative Primitives (deterministic)
    strategy_reflections: list[dict] = Field(default=[], sa_column=Column(JSON))
    evolution_observations: list[dict] = Field(default=[], sa_column=Column(JSON))
    topology_insights: list[dict] = Field(default=[], sa_column=Column(JSON))

    # AI Narrative Synthesis — stored alongside deterministic state for full auditability.
    # IMPORTANT: ai_narrative may be None. primary_narrative always has a deterministic fallback.
    ai_narrative: str | None = Field(default=None)
    narrative_context_hash: str | None = Field(default=None)   # SHA-256(context + prompt_version)
    narrative_context_json: dict | None = Field(default=None, sa_column=Column(JSON))  # Raw semantic context snapshot
    narrative_generated_at: datetime | None = Field(default=None)
    narrative_model: str | None = Field(default=None)          # e.g. "gpt-4o" — auditability
    narrative_prompt_version: str | None = Field(default=None) # Prompt semver — triggers regen on upgrade
    narrative_generation_reason: str | None = Field(default=None)  # e.g. "cognition_drift", "initial_generation"

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
