import { useMutation } from '@tanstack/react-query';
import { recommendationService } from '../services/api';
import { RecommendationRequest, RecommendationResponse } from '../types/api';
import { AxiosError } from 'axios';

export const useRecommendation = () => {
  return useMutation<RecommendationResponse, AxiosError<{ detail?: string }>, RecommendationRequest>({
    mutationFn: recommendationService.evaluateTransaction,
  });
};
