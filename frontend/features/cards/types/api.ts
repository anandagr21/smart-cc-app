export interface CardCatalogResponse {
  id: string;
  card_name: string;
  bank_name: string;
  network: string;
  joining_fee: number;
  annual_fee: number;
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
  is_active: boolean;
  created_at: string;
  updated_at: string;
  card_details?: CardCatalogResponse;
}

export interface UserCardCreate {
  card_catalog_id: string;
  nickname?: string;
  credit_limit?: number;
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
