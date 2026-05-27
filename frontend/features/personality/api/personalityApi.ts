import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';

export enum OptimizationPersonality {
  MAXIMIZE_REWARDS = "MAXIMIZE_REWARDS",
  TRAVEL_OPTIMIZATION = "TRAVEL_OPTIMIZATION",
  FEE_MINIMIZATION = "FEE_MINIMIZATION",
  BALANCED_INTELLIGENCE = "BALANCED_INTELLIGENCE",
  WALLET_SIMPLICITY = "WALLET_SIMPLICITY"
}

export interface PersonalityProfileResponse {
  active_personality: OptimizationPersonality;
  is_inferred: boolean;
  confidence_score: number;
}

export const usePersonalityProfile = () => {
  return useQuery({
    queryKey: ['personality_profile'],
    queryFn: async () => {
      const response = await apiClient.get<PersonalityProfileResponse>('/personality/');
      return response.data;
    },
  });
};

export const useUpdatePersonality = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (personality: OptimizationPersonality) => {
      const response = await apiClient.put<PersonalityProfileResponse>('/personality/', {
        personality
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['personality_profile'], data);
    },
  });
};
