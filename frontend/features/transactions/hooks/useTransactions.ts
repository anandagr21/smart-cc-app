import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '../services/transactionService';
import { TransactionCreate } from '../types/transaction.types';

export const TRANSACTIONS_QUERY_KEY = ['transactions'];

export function useTransactions() {
  return useInfiniteQuery({
    queryKey: TRANSACTIONS_QUERY_KEY,
    queryFn: ({ pageParam = 0 }) => transactionService.fetchUserTransactions(pageParam, 50),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // Assuming simple pagination: if we get 50 items, there might be more.
      // A more robust backend would return a `has_next` or `total` in meta.
      const currentCount = allPages.reduce((acc, page) => acc + page.data.length, 0);
      if (lastPage.data.length === 50) {
        return currentCount;
      }
      return undefined;
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TransactionCreate) => transactionService.createTransaction(data),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
    },
  });
}
