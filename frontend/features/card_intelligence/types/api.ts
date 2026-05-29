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
