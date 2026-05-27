import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';

export interface NarrativeObservation {
  id: string;
  category: string;
  tone: string;
  importance: number;
  generated_at: string;
  narrative: string;
  supporting_metrics: Record<string, any>;
}

export interface PortfolioEvolutionSnapshot {
  snapshot_date: string;
  complexity_score: number;
  value_density: number;
  redundancy_score: number;
  fee_efficiency_score: number;
  strategic_alignment_score: number;
  primary_narrative: string | null;
  strategy_reflections: NarrativeObservation[];
  evolution_observations: NarrativeObservation[];
  topology_insights: NarrativeObservation[];
  // AI Synthesis Layer — present only when AI is configured and cognition state has drifted
  ai_narrative: string | null;
  narrative_generation_reason: string | null;
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
