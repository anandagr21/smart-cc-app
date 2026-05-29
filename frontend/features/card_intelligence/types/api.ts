export type CardDocumentType =
  | 'REWARD_GUIDE'
  | 'MITC'
  | 'FEES_AND_CHARGES'
  | 'BENEFITS_GUIDE'
  | 'EXCLUSIONS'
  | 'MILESTONE_RULES'
  | 'OFFER_TERMS'
  | 'GENERAL_TERMS';

export type DocumentProcessingStatus =
  | 'UPLOADED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export interface DocumentResponse {
  id: string;
  card_id: string;
  document_type: CardDocumentType;
  file_name: string;
  uploaded_at: string;
  processing_status: DocumentProcessingStatus;
  document_version: number;
  is_latest_version: boolean;
}

export interface JobResponse {
  id: string;
  document_id: string;
  status: DocumentProcessingStatus;
  started_at: string | null;
  completed_at: string | null;
  logs: string[] | null;
  pipeline_version: string;
  trigger_source: string;
}
