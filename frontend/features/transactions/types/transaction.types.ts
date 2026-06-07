export enum TransactionStatus {
  PENDING = 'pending',
  POSTED = 'posted',
  REVERSED = 'reversed',
}

export enum TransactionType {
  PURCHASE = 'purchase',
  REFUND = 'refund',
  REVERSAL = 'reversal',
  FEE = 'fee',
  EMI = 'emi',
}

export enum Currency {
  INR = 'INR',
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
}

export enum PaymentMode {
  ONLINE = 'online',
  OFFLINE = 'offline',
  CONTACTLESS = 'contactless',
  UPI = 'upi',
  INTERNATIONAL = 'international',
  ANY = 'any',
}

export interface TransactionBase {
  user_card_id: string;
  merchant_name: string;
  amount: number;
  currency?: Currency;
  payment_mode?: PaymentMode;
  transaction_type?: TransactionType;
  transaction_date: string; // YYYY-MM-DD
  description?: string;
  external_reference?: string;
  raw_description?: string;
  source?: string;
  statement_id?: string;
  recommended_card_id?: string;
  override_reason?: string;
}

export interface TransactionCreate extends TransactionBase {}

export interface TransactionUpdate {
  merchant_name?: string;
  amount?: number;
  currency?: Currency;
  payment_mode?: PaymentMode;
  transaction_type?: TransactionType;
  transaction_date?: string; // YYYY-MM-DD
  description?: string;
  status?: TransactionStatus;
  user_card_id?: string;
}

export interface TransactionUpdateStatus {
  status: TransactionStatus;
  posted_date?: string;
}

export interface TransactionResponse extends TransactionBase {
  id: string;
  user_id: string;
  normalized_merchant: string;
  category: string;
  status: TransactionStatus;
  posted_date?: string;
  created_at: string;
  updated_at: string;
  
  // Enrichment Insights
  reward_earned?: number | null;
  reward_type?: string | null;
  best_possible_card?: string | null;
  missed_savings?: number | null;
  recommendation_reason?: string | null;
  warnings?: string[];
}

// To support the timeline view grouped by date
export interface TransactionGroup {
  title: string;
  data: TransactionResponse[];
}
