from datetime import date, datetime
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel, Relationship

class PortfolioEvolutionSnapshot(SQLModel, table=True):
    """
    Stores longitudinal portfolio cognition metrics over time.
    Calculated periodically (e.g., monthly) or upon request to track
    how the user's wallet is evolving in terms of complexity, value, and redundancy.
    """
    __tablename__ = "portfolio_evolution_snapshots"

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

    created_at: datetime = Field(default_factory=datetime.utcnow)
