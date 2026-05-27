from pydantic import BaseModel, Field
from datetime import datetime
from uuid import uuid4

class NarrativeObservation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    category: str
    tone: str
    importance: float
    generated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    narrative: str
    supporting_metrics: dict
