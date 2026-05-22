import { useQuery } from '@tanstack/react-query';
import { fetchCardCatalog } from '../api/cardsApi';
import { useAuthStore } from '../../auth/store/authStore';

export const useCardCatalog = () => {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['cardCatalog'],
    queryFn: fetchCardCatalog,
    enabled: !!token,
    staleTime: 1000 * 60 * 60, // 1 hour (catalog rarely changes)
  });
};
