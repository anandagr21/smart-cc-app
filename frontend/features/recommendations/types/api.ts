export type PaymentMode = 'ANY' | 'ONLINE' | 'OFFLINE' | 'INTERNATIONAL';
export type RewardType = 'CASHBACK' | 'POINTS' | 'MILES' | 'STATEMENT_CREDIT';

export type OptimizationIntent = 'MAX_REWARDS' | 'SAVE_FEE_WAIVER' | 'BALANCED' | 'SIMPLIFY_DECISIONS';

export interface RecommendationRequest {
  merchant_name: string;
  amount: number;
  payment_mode?: PaymentMode;
  transaction_date?: string;
  mcc_code?: string;
  intent?: OptimizationIntent;
}

export interface OptimizerRankedCard {
  card_id: string;
  card_name: string;
  immediate_reward_value: number;
  fee_waiver_progress_impact: number;
  simplification_score: number;
  blended_total_value: number;
  explanation: string;
  confidence_label: string;
  reward_type: string;
  cashback_amount: number | null;
  reward_points: number | null;
}

export interface RecommendationResponse {
  normalized_merchant: string | null;
  category: string | null;
  best_cashback_card: OptimizerRankedCard | null;
  best_fee_waiver_card: OptimizerRankedCard | null;
  best_balanced_card: OptimizerRankedCard | null;
  best_simplify_card: OptimizerRankedCard | null;
  all_ranked_cards: OptimizerRankedCard[];
  explanations: string[];
  warnings: string[];
}

export interface SingleResponse<T> {
  data: T;
}
