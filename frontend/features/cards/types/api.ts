export interface CardCatalogResponse {
  id: string;
  card_name: string;
  bank_name: string;
  network: string;
  joining_fee: number;
  annual_fee: number;
  fee_waiver_spend_threshold: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCardResponse {
  id: string;
  user_id: string;
  card_catalog_id: string;
  nickname: string | null;
  credit_limit: number;
  current_spend: number;
  annual_spend: number;
  billing_date: number;
  due_date: number;
  fee_cycle_start_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  card_details?: CardCatalogResponse;
  
  // Fee Intelligence
  catalog_annual_fee?: number | null;
  user_override_annual_fee?: number | null;
  effective_annual_fee?: number | null;
  fee_confidence?: 'HIGH' | 'USER_CALIBRATED' | 'ESTIMATED' | null;

  fee_waiver_threshold?: number | null;
  fee_waiver_progress_percent?: number | null;
  remaining_spend_for_waiver?: number | null;
  waiver_achieved?: boolean | null;
  projected_waiver_status?: string | null;
}

export interface UserCardUpdate {
  nickname?: string;
  is_active?: boolean;
  credit_limit?: number;
  current_spend?: number;
  annual_spend?: number;
  billing_date?: number;
  due_date?: number;
  fee_cycle_start_date?: string;
  user_override_annual_fee?: number;
}

export interface UserCardCreate {
  card_catalog_id: string;
  nickname?: string;
  credit_limit?: number;
  current_spend?: number;
  annual_spend?: number;
  billing_date?: number;
  due_date?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    page_size: number;
    has_next: boolean;
  };
}

export interface SingleResponse<T> {
  data: T;
}
