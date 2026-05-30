import { apiClient } from '@/services/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RewardRuleResponse } from '../types/rules';

// ---- Reward Rules API ----

export const fetchCardRules = async (cardId: string): Promise<RewardRuleResponse[]> => {
  const { data } = await apiClient.get<{ data: RewardRuleResponse[] }>(`/reward-rules/card/${cardId}`);
  return data.data;
};

export const deleteRule = async (ruleId: string): Promise<void> => {
  await apiClient.delete(`/reward-rules/${ruleId}`);
};

export const updateRule = async (ruleId: string, payload: {
  rule_name?: string;
  rule_type?: string;
  priority?: number;
  is_active?: boolean;
  rule_config?: Record<string, any>;
}): Promise<RewardRuleResponse> => {
  const { data } = await apiClient.patch<{ data: RewardRuleResponse }>(`/reward-rules/${ruleId}`, payload);
  return data.data;
};

export const useCardRewardRules = (cardId: string | null) => {
  return useQuery({
    queryKey: ['card-reward-rules', cardId],
    queryFn: () => fetchCardRules(cardId!),
    enabled: !!cardId,
  });
};

export const useDeleteRewardRule = (cardId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) => deleteRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-reward-rules', cardId] });
    },
  });
};

export const useUpdateRewardRule = (cardId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { ruleId: string; payload: Parameters<typeof updateRule>[1] }) =>
      updateRule(params.ruleId, params.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-reward-rules', cardId] });
    },
  });
};
