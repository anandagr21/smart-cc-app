import { apiClient } from '@/services/api/client';
import { RecommendationRequest, RecommendationResponse, SingleResponse } from '../types/api';

export const recommendationService = {
  /**
   * Evaluate a transaction to get ranked card recommendations.
   */
  evaluateTransaction: async (data: RecommendationRequest): Promise<RecommendationResponse> => {
    const response = await apiClient.post<SingleResponse<RecommendationResponse>>(
      '/recommendations/evaluate',
      data
    );
    return response.data.data;
  },
};
