from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
from uuid import UUID

# --- V2 WORKSPACE SCHEMA --- #

class TrustFactor(BaseModel):
    factor: str
    is_positive: bool

class SourceTrustMatrix(BaseModel):
    overall_score: int
    sources: dict
    trust_factors: List[TrustFactor]

class PublishReadiness(BaseModel):
    overall_score: int
    categories: dict

class RequiredAction(BaseModel):
    id: str
    title: str
    description: str
    action_text: str
    action_type: str # "SET_POINT_VALUE", "UPLOAD_MITC", "ADD_ALIAS", "CONFIRM_CONDITION"
    severity: str # "BLOCKER", "WARNING", "INFO"

class WorkspaceHealthSummary(BaseModel):
    status: str
    readiness: int
    risk: str
    
class AdminReviewActionPayload(BaseModel):
    card_id: str
    approve: bool
    edited_json: dict = {}

class CardWorkspaceAggregate(BaseModel):
    card_id: UUID
    card_name: str
    bank_name: str
    
    health: WorkspaceHealthSummary
    trust_matrix: SourceTrustMatrix
    publish_readiness: PublishReadiness
    required_actions: List[RequiredAction]
    
    extracted_data: dict 
    
    model_config = ConfigDict(from_attributes=True)
