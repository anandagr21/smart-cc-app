import { useMutation } from '@tanstack/react-query';
import { recommendationService } from '../services/api';
import { RecommendationRequest, RecommendationResponse } from '../types/api';
import { AxiosError } from 'axios';

import * as Sentry from '@sentry/react-native';

export const useRecommendation = () => {
  return useMutation<RecommendationResponse, AxiosError<{ detail?: string }>, RecommendationRequest>({
    mutationFn: recommendationService.evaluateTransaction,
    onSuccess: (data, variables) => {
      Sentry.addBreadcrumb({
        category: 'business',
        message: 'Recommendation Generated',
        data: {
          merchant: variables.merchant_name,
          amount: variables.amount,
        },
      });
    },
  });
};
