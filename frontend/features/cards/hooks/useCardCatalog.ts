import { useQuery } from '@tanstack/react-query';
import { fetchCardCatalog } from '../api/cardsApi';
import { useAuthStore } from '@/features/auth/store/authStore';
import { QueryKeys } from '@/features/core/api/queryKeys';

export const useCardCatalog = (enabled: boolean = true) => {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: QueryKeys.catalog.all,
    queryFn: fetchCardCatalog,
    enabled: !!token && enabled,
    staleTime: 1000 * 60 * 60, // 1 hour (catalog rarely changes)
  });
};
