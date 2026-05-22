import { useQuery } from '@tanstack/react-query';
import { fetchUserCards } from '../api/cardsApi';
import { useAuthStore } from '../../auth/store/authStore';

export const useCards = () => {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['userCards'],
    queryFn: fetchUserCards,
    enabled: !!token,
  });
};
