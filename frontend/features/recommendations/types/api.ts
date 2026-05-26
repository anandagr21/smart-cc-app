export type PaymentMode = 'ANY' | 'ONLINE' | 'OFFLINE' | 'INTERNATIONAL';
export type RewardType = 'CASHBACK' | 'POINTS' | 'MILES' | 'STATEMENT_CREDIT';

export interface RecommendationRequest {
  merchant_name: string;
  amount: number;
  payment_mode?: PaymentMode;
  transaction_date?: string;
  mcc_code?: string;
}

export interface RankedCardResponse {
  card_id: string;
  card_name: string;
  rank: number;
  effective_reward_value: number;
  cashback_amount: number | null;
  reward_points: number | null;
  reward_type: RewardType;
  recommendation_reason: string;
  warnings: string[];
  // Core Engine Metrics
  portfolio_score: number;
  immediate_reward_value: number;
  long_term_portfolio_value: number;
  waiver_acceleration: number;
  milestone_acceleration: number;
  
  // Explainability & Breakdown
  portfolio_score_breakdown: Record<string, number>;
  objective_rankings: Record<string, number>;
  reason_codes: string[];
  explanation: string;
  
  // Structured Metadata for UI
  reason_title: string;
  reason_description: string;
  strategic_value: number;
  total_projected_value: number;
  confidence_score: number;
  primary_strategy: string;
  supporting_factors: string[];
  recommendation_strength: string;
}

export interface RecommendationResponse {
  normalized_merchant: string | null;
  category: string | null;
  best_card: string | null;
  ranked_cards: RankedCardResponse[];
  explanations: string[];
  warnings: string[];
}

export interface SingleResponse<T> {
  data: T;
}
