import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../services/api/client';
import { UserCardResponse } from '../types/api';

interface UpdateCardPayload {
  nickname?: string;
  is_active?: boolean;
  credit_limit?: number;
  billing_date?: number;
  due_date?: number;
}

export const useUpdateCard = (cardId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateCardPayload) => {
      const { data } = await apiClient.patch<{ data: UserCardResponse }>(`/cards/${cardId}`, payload);
      return data.data;
    },
    onMutate: async (newCardPayload) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['cards'] });

      // Snapshot the previous value
      const previousCards = queryClient.getQueryData<UserCardResponse[]>(['cards']);

      // Optimistically update to the new value
      if (previousCards) {
        queryClient.setQueryData<UserCardResponse[]>(['cards'], (old) => {
          if (!old) return [];
          return old.map(card => 
            card.id === cardId ? { ...card, ...newCardPayload } : card
          );
        });
      }

      // Return a context with the previous cards
      return { previousCards };
    },
    onError: (err, newCard, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousCards) {
        queryClient.setQueryData(['cards'], context.previousCards);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure backend sync
      queryClient.invalidateQueries({ queryKey: ['cards'] });
    },
  });
};
