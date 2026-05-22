import { useQuery } from '@tanstack/react-query';
import { fetchUserCards } from '../api/cardsApi';
import { useAuthStore } from '../../auth/store/authStore';
import { QueryKeys } from '../../core/api/queryKeys';

export const useCards = () => {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: QueryKeys.cards.wallet(),
    queryFn: fetchUserCards,
    enabled: !!token,
  });
};
