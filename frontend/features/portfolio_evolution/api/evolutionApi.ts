import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../services/api/client';

export interface PortfolioEvolutionSnapshot {
  snapshot_date: string;
  complexity_score: number;
  value_density: number;
  redundancy_score: number;
  fee_efficiency_score: number;
  strategic_alignment_score: number;
  primary_narrative: string | null;
  created_at: string;
}

export const usePortfolioEvolution = () => {
  return useQuery({
    queryKey: ['portfolioEvolution'],
    queryFn: async (): Promise<PortfolioEvolutionSnapshot> => {
      const response = await apiClient.get('/portfolio-evolution/');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
