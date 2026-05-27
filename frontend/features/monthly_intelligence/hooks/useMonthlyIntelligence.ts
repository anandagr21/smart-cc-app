import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import { QueryKeys } from '@/features/core/api/queryKeys';
import { MonthlySummaryResponse } from '../types/monthly_intelligence.types';

export function useMonthlyIntelligence(year: number, month: number) {
  const { data, isLoading, error } = useQuery<MonthlySummaryResponse>({
    queryKey: QueryKeys.monthlyIntelligence.summary(year, month),
    queryFn: async () => {
      const response = await apiClient.get('/monthly-intelligence/', {
        params: { year, month },
      });
      return response.data;
    },
  });

  return {
    data,
    isLoading,
    error,
  };
}
