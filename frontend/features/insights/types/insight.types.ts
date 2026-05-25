import { UserCardResponse } from '../../cards/types/api';
import { TransactionResponse } from '../../transactions/types/transaction.types';

export type InsightPriority = 'HIGH' | 'MEDIUM' | 'INFORMATIONAL';

export type InsightCategory = 
  | 'FEE_WAIVER'
  | 'MISSED_REWARDS'
  | 'UNDERUTILIZED_CARD'
  | 'PORTFOLIO_OPTIMIZATION'
  | 'MONTHLY_SUMMARY';

export type InsightConfidence = 'HIGH' | 'MODERATE' | 'ESTIMATED';

export interface InsightResult {
  id: string; // unique identifier for the insight
  category: InsightCategory;
  priority: InsightPriority;
  confidence: InsightConfidence;
  
  // Presentation
  title: string;          // E.g., "NEAR WAIVER"
  description: string;    // E.g., "₹12k more spend unlocks fee waiver on Amex."
  reasoning: string;      // E.g., "You have spent ₹88k out of ₹100k target this year."
  icon: any;              // LucideIcon component reference
  color: string;          // Hex color for presentation
  
  // Mathematical Context (Optional, for sorting/deltas)
  monetaryValue?: number; // E.g., 420 for "Missed 420 in rewards"
  relatedCardId?: string; // If this insight points to a specific card
}

export interface InsightEngineContext {
  cards: UserCardResponse[];
  transactions: TransactionResponse[];
  // Extensible for future summary windows
  timeWindow?: {
    start: Date;
    end: Date;
  };
}

export type InsightGenerator = (context: InsightEngineContext) => InsightResult[];
