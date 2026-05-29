import { useQuery } from '@tanstack/react-query';
import { fetchCardRules } from '../api/cardsApi';

export const useCardRules = (cardId: string | undefined) => {
  return useQuery({
    queryKey: ['cardRules', cardId],
    queryFn: () => fetchCardRules(cardId!),
    enabled: !!cardId,
  });
};
