import { apiClient } from '@/services/api/client';

export interface FeedbackCreatePayload {
  calculation_id?: string | null;
  merchant_name: string;
  transaction_amount: number;
  card_id: string;
  calculated_reward: number;
  rule_version: string;
  issue_type: string;
  issue_description?: string | null;
  calculation_context: Record<string, any>;
}

export interface FeedbackResponse extends FeedbackCreatePayload {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
}

export const feedbackApi = {
  submitFeedback: async (data: FeedbackCreatePayload) => {
    const response = await apiClient.post('/feedback/', data);
    return response.data;
  },
  getFeedbacks: async (skip: number = 0, limit: number = 50) => {
    const response = await apiClient.get('/feedback/', { params: { skip, limit } });
    return response.data;
  }
};
