import { UserCardResponse } from '@/features/cards/types/api';
import { TransactionResponse } from '@/features/transactions/types/transaction.types';

export type InsightPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'INFORMATIONAL';

export type InsightCategory =
  | 'FEE_WAIVER'
  | 'MISSED_REWARDS'
  | 'UNDERUTILIZED_CARD'
  | 'PORTFOLIO_OPTIMIZATION'
  | 'DORMANT_CARD';

export type InsightConfidence = 'HIGH' | 'MODERATE' | 'ESTIMATED';

export interface InsightResult {
  id: string; // unique identifier for the insight
  category: InsightCategory;
  priority: InsightPriority;
  confidence: InsightConfidence;
  
  title: string;
  summary: string;
  reasoning: string;
  
  badge_label: string;
  badge_color: string;
  
  related_card_id?: string;
  monetary_value?: number;
  recommended_action?: Record<string, any>;
  source_transactions: string[];
  actionability_score: number;
  insight_hash: string;
  cooldown_period_hours: number;
  generated_at: string;
  expires_at?: string;
}
