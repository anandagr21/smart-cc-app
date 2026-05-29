import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateCardCatalog } from '../api/cardsApi';
import { CardCatalogResponse } from '../types/api';
import { QueryKeys } from '@/features/core/api/queryKeys';

export const useUpdateCatalogCard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cardId, data }: { cardId: string; data: Partial<CardCatalogResponse> }) =>
      updateCardCatalog(cardId, data),
    onSuccess: () => {
      // Invalidate the catalog cache so it re-fetches
      queryClient.invalidateQueries({ queryKey: QueryKeys.catalog.all });
    },
  });
};
