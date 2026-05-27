import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import { QueryKeys } from '@/features/core/api/queryKeys';
import { InsightResult } from '../types/insight.types';

export function useSpendInsights() {
  const { data: insights = [], isLoading } = useQuery<InsightResult[]>({
    queryKey: QueryKeys.insights.all,
    queryFn: async () => {
      const response = await apiClient.get('/insights/');
      return response.data;
    },
  });

  const getInsightForCard = (cardId: string): InsightResult | undefined => {
    return insights.find(i => i.related_card_id === cardId);
  };

  const primaryInsight = insights.length > 0 ? insights[0] : null;

  return {
    insights,
    primaryInsight,
    getInsightForCard,
    isLoading,
  };
}
