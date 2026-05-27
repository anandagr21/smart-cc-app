import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import { UserCardResponse } from '../types/api';
import { QueryKeys } from '@/features/core/api/queryKeys';

interface UpdateCardPayload {
  nickname?: string;
  card_status?: string;
  credit_limit?: number;
  billing_date?: number;
  due_date?: number;
  user_override_annual_fee?: number;
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
      await queryClient.cancelQueries({ queryKey: QueryKeys.cards.wallet() });

      // Snapshot the previous value
      const previousCards = queryClient.getQueryData<UserCardResponse[]>(QueryKeys.cards.wallet());

      // Optimistically update to the new value
      if (previousCards) {
        queryClient.setQueryData<UserCardResponse[]>(QueryKeys.cards.wallet(), (old) => {
          if (!old) return [];
          return old.map(card => {
            if (card.id !== cardId) return card;
            
            // For optimistic UI, if they change user_override_annual_fee, we should optimistically
            // compute the new effective_annual_fee so the UI immediately reflects it.
            const updatedCard = { ...card, ...newCardPayload };
            if (newCardPayload.user_override_annual_fee !== undefined) {
              updatedCard.effective_annual_fee = newCardPayload.user_override_annual_fee;
              updatedCard.fee_confidence = 'USER_CALIBRATED';
            }
            return updatedCard;
          });
        });
      }

      // Return a context with the previous cards
      return { previousCards };
    },
    onError: (err, newCard, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousCards) {
        queryClient.setQueryData(QueryKeys.cards.wallet(), context.previousCards);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure backend sync
      queryClient.invalidateQueries({ queryKey: QueryKeys.cards.wallet() });
    },
  });
};
