export type KnowledgeSourceType =
  | 'PDF'
  | 'URL'
  | 'HTML';

export type ProcessingStatus =
  | 'DISCOVERED'
  | 'IMPORTED'
  | 'UPLOADED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export interface KnowledgeSourceResponse {
  id: string;
  card_id: string;
  source_type: KnowledgeSourceType;
  source_url: string | null;
  source_title: string | null;
  file_name: string | null;
  uploaded_at: string;
  processing_status: ProcessingStatus;
  processing_error?: string | null;
  document_version: number;
  is_latest_version: boolean;
}

export interface JobResponse {
  id: string;
  knowledge_source_id: string;
  status: ProcessingStatus;
  started_at: string | null;
  completed_at: string | null;
  logs: string[] | null;
  pipeline_version: string;
  trigger_source: string;
}

export type CandidateStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';

export type CandidateType = 'CARD_FIELD' | 'REWARD_RULE' | 'FEE_RULE' | 'BENEFIT' | 'EXCLUSION' | 'MILESTONE' | 'OFFER';

export interface CardExtractionCandidateResponse {
  id: string;
  card_id: string;
  candidate_type: CandidateType;
  entity_identifier: string | null;
  field_name: string;
  current_value: Record<string, any> | null;
  proposed_value: Record<string, any>;
  confidence_score: number;
  source_id: string;
  source_page: number | null;
  source_text: string;
  status: CandidateStatus;
  review_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface CandidateUpdatePayload {
  status: CandidateStatus;
  proposed_value?: Record<string, any>;
  review_notes?: string;
}

export interface PublishPreviewResponse {
  reward_rules_added: number;
  reward_rules_updated: number;
  benefits_added: number;
  fees_updated: number;
  total_candidates: number;
}

export interface PublishResponse {
  version_id: string;
  version: number;
  published_at: string;
  change_summary: Record<string, any>;
}

// --- V2 WORKSPACE TYPES --- //

export type WorkspaceStatus = 'DRAFT' | 'EXTRACTED' | 'REVIEWING' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'STALE';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface TrustFactor {
  factor: string;
  isPositive: boolean;
}

export interface SourceTrustMatrix {
  overallScore: number;
  sources: Record<string, number>;
  trustFactors: TrustFactor[];
}

export interface PublishReadiness {
  overall_score: number;
  categories: Record<string, number>; // e.g. { Fees: 100, Exclusions: 0 }
}

export interface PublishRisk {
  level: RiskLevel;
  reasons: string[];
}

export interface TimelineEvent {
  date: string;
  eventType: string;
  description: string;
}

export interface RewardSimulation {
  spendAmount: number;
  pointsEarned: number;
  pointValue: number;
  effectiveReturnPercentage: number;
}

export interface RewardTranslation {
  documentText: string;
  systemInterpretation: string;
  pointValueKnown: boolean;
  pointValue?: number;
  effectiveReward?: string;
  simulators: RewardSimulation[];
  conditions: string[];
  confidenceScore: number;
  confidenceLevel: string;
  confidenceReason: string;
}

export interface WorkspaceReward {
  category: string;
  title: string;
  merchants: string[];
  translation: RewardTranslation;
  status: string;
  statusReason?: string;
  sourceDocuments: string[];
}

export interface MerchantCoverageItem {
  name: string;
  coverageType: string;
  aliases: string[];
  transactionsSeen: number;
  status: string;
}

export interface WorkspaceHealthSummary {
  status: WorkspaceStatus;
  readiness: number;
  risk: string;
  blockers: number;
}

export type ActionSeverity = 'BLOCKER' | 'WARNING' | 'INFO';

export interface RequiredAction {
  id: string;
  title: string;
  description: string;
  action_text: string;
  action_type: string;
  severity: ActionSeverity;
}

export interface PublishBlocker {
  message: string;
  impact: string;
}

export interface ProductionImpactSimulation {
  scenarioName: string;
  beforeReward: string;
  afterReward: string;
}

export interface CardWorkspaceData {
  workspace_version: number;
  generated_from_sources: string[];
  card_id: string;
  card_name: string;
  status: WorkspaceStatus;
  status_reason?: string;
  source_trust: SourceTrustMatrix;
  publish_readiness: PublishReadiness;
  publish_risk: PublishRisk;
  required_actions: RequiredAction[];
  publish_blockers: PublishBlocker[];
  timeline: TimelineEvent[];
  fees: any[];
  rewards: WorkspaceReward[];
  merchant_coverage: MerchantCoverageItem[];
  benefits: any[]; 
  milestones: any[]; 
  publish_preview: any; 
  production_impact: ProductionImpactSimulation[];
}
