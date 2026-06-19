import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addUserCard } from '../api/cardsApi';
import { UserCardCreate } from '../types/api';
import { invalidateWalletIntelligence } from '@/features/core/api/queryUtils';
import * as Sentry from '@sentry/react-native';

export const useAddCard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UserCardCreate) => addUserCard(data),
    onSuccess: (data, variables) => {
      Sentry.addBreadcrumb({
        category: 'business',
        message: 'Card Added',
        data: {
          cardId: variables.card_catalog_id,
        },
      });
      // Invalidate the broader intelligence queries
      invalidateWalletIntelligence(queryClient);
    },
    onSettled: () => {
      // Force refetch of wallet to ensure UI updates immediately
      queryClient.invalidateQueries({ queryKey: ['cards', 'wallet'] });
    },
  });
};
