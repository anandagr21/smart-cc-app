import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addUserCard } from '../api/cardsApi';
import { UserCardCreate } from '../types/api';
import { invalidateWalletIntelligence } from '@/features/core/api/queryUtils';

export const useAddCard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UserCardCreate) => addUserCard(data),
    onSuccess: () => {
      // Invalidate the cards query so the wallet instantly refreshes
      invalidateWalletIntelligence(queryClient);
    },
  });
};
