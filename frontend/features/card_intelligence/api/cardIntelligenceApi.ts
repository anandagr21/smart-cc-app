import { apiClient } from '@/services/api/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QueryKeys } from '@/features/core/api/queryKeys';

export const submitUrlSource = async (
  bankName: string,
  cardName: string,
  url: string,
  sourceTitle: string
): Promise<any> => {
  const { data } = await apiClient.post<any>('/card-intelligence/ingest-raw', {
    bank_name: bankName,
    card_name: cardName,
    url,
    source_title: sourceTitle
  });
  return data;
};

export const useSubmitUrlSource = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { bankName: string; cardName: string; url: string; sourceTitle: string }) =>
      submitUrlSource(params.bankName, params.cardName, params.url, params.sourceTitle),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.catalog.all });
    },
  });
};

// ── Structured Verification Pipeline ────────────────────────────────────────

export interface RewardRule {
  category_name: string;
  multiplier: number;
  reward_type: 'points' | 'cashback' | 'miles';
  has_cap: boolean;
  cap_limit: number | null;
  cap_cycle: 'monthly' | 'statement' | 'annual' | null;
  merchant_exclusions: string[];
}

export interface CardMilestone {
  spend_target: number;
  reward_payout: string;
  cycle: 'monthly' | 'quarterly' | 'annual';
}

export interface SuggestedCardData {
  card_name: string;
  bank_issuer: string;
  currency: string;
  base_reward_rate_per_100: number;
  annual_fee: number | null;
  joining_fee: number | null;
  fee_waiver_spend_threshold: number | null;
  reward_rules: RewardRule[];
  milestones: CardMilestone[];
}

export interface ReviewPayloadResponse {
  card_id: string;
  source_markdown: string;
  suggested_database_json: SuggestedCardData;
}

export interface AdminReviewActionPayload {
  card_id: string;
  approve: boolean;
  edited_json: SuggestedCardData;
}

export const fetchCardReviewData = async (cardId: string): Promise<ReviewPayloadResponse> => {
  const { data } = await apiClient.get<ReviewPayloadResponse>(`/card-intelligence/review/${cardId}`);
  return data;
};

export const submitReviewAction = async (payload: AdminReviewActionPayload): Promise<any> => {
  const { data } = await apiClient.post('/card-intelligence/review/action', payload);
  return data;
};

export const useCardReviewData = (cardId: string) => {
  return useQuery({
    queryKey: ['card-review-data', cardId],
    queryFn: () => fetchCardReviewData(cardId),
    enabled: !!cardId,
  });
};

export const useSubmitReviewAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitReviewAction,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['card-review-data', variables.card_id] });
      queryClient.invalidateQueries({ queryKey: ['coverage-summary'] });
    },
  });
};
