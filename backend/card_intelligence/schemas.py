from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from .models import KnowledgeSourceType, ProcessingStatus

class KnowledgeSourceResponse(BaseModel):
    id: UUID
    card_id: UUID
    source_type: KnowledgeSourceType
    source_url: Optional[str]
    source_title: Optional[str]
    file_name: Optional[str]
    uploaded_at: datetime
    processing_status: ProcessingStatus
    document_version: int
    is_latest_version: bool
    
    model_config = ConfigDict(from_attributes=True)

class JobResponse(BaseModel):
    id: UUID
    knowledge_source_id: UUID
    status: ProcessingStatus
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    logs: Optional[List[str]]
    pipeline_version: str
    trigger_source: str
    
    model_config = ConfigDict(from_attributes=True)

class CardExtractionCandidateResponse(BaseModel):
    id: UUID
    card_id: UUID
    candidate_type: str
    entity_identifier: Optional[str]
    field_name: str
    current_value: Optional[dict]
    proposed_value: dict
    change_type: str
    published_rule_id: Optional[str] = None
    confidence_score: float
    source_id: UUID
    source_page: Optional[int]
    source_text: str
    status: str
    review_notes: Optional[str]
    created_at: datetime
    reviewed_at: Optional[datetime]
    reviewed_by: Optional[UUID]
    
    model_config = ConfigDict(from_attributes=True)

class CandidateUpdatePayload(BaseModel):
    status: str
    proposed_value: Optional[dict] = None
    review_notes: Optional[str] = None

class PublishPreviewResponse(BaseModel):
    reward_rules_added: int
    reward_rules_updated: int
    reward_rules_removed: int
    benefits_added: int
    fees_updated: int
    total_candidates: int

class PublishResponse(BaseModel):
    version_id: UUID
    version: int
    published_at: datetime
    change_summary: dict

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
    blockers: int

class IntelligenceTimelineEvent(BaseModel):
    date: datetime
    event_type: str 
    description: str

class RewardSimulation(BaseModel):
    spend_amount: int
    points_earned: int
    point_value: float
    effective_return_percentage: float

class RewardTranslation(BaseModel):
    document_text: str
    system_interpretation: str
    point_value_known: bool
    point_value: Optional[float]
    effective_reward: Optional[str]
    conditions: List[str]
    confidence_score: int
    confidence_level: str
    confidence_reason: str

class AggregatedReward(BaseModel):
    category: str
    title: str
    merchants: List[str]
    translation: RewardTranslation
    status: str # "READY", "BLOCKED", "INCOMPLETE"
    status_reason: Optional[str]
    source_documents: List[str] = None

class MerchantCoverageItem(BaseModel):
    name: str
    coverage_type: str # "MERCHANT", "CATEGORY", "MCC"
    aliases: List[str]
    transactions_seen: int
    status: str

class ProductionImpactSimulation(BaseModel):
    scenario_name: str
    before_reward: str
    after_reward: str

class CardWorkspaceAggregate(BaseModel):
    workspace_version: int
    generated_from_sources: List[UUID]
    card_id: UUID
    card_name: str
    status: str
    status_reason: Optional[str] = None
    source_trust: SourceTrustMatrix
    publish_readiness: PublishReadiness
    required_actions: List[RequiredAction]
    publish_blockers: List[dict]
    publish_risk: dict
    timeline: List[IntelligenceTimelineEvent]
    fees: list
    rewards: List[AggregatedReward]
    merchant_coverage: List[MerchantCoverageItem]
    benefits: list
    milestones: list
    publish_preview: Optional[dict] = None
    production_impact: List[ProductionImpactSimulation]
