import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '../services/transactionService';
import { TransactionCreate } from '../types/transaction.types';
import { QueryKeys } from '../../core/api/queryKeys';
import { invalidateTransactionsAndWallet } from '../../core/api/queryUtils';

export function useTransactions(filters?: { cardId?: string }) {
  return useInfiniteQuery({
    queryKey: QueryKeys.transactions.feed(filters),
    queryFn: ({ pageParam = 0 }) => transactionService.fetchUserTransactions(pageParam, 50, filters?.cardId),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
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
    onSuccess: (newTransaction) => {
      // 1. Optimistic Cache Patching for instant UI feedback
      queryClient.setQueryData(QueryKeys.transactions.feed(), (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;
        const newPages = [...oldData.pages];
        if (newPages.length > 0) {
          newPages[0] = {
            ...newPages[0],
            data: [newTransaction, ...newPages[0].data],
          };
        }
        return { ...oldData, pages: newPages };
      });

      // 2. Invalidate and refetch BOTH feed and wallet (for eventual consistency and fee waiver updates)
      invalidateTransactionsAndWallet(queryClient);
    },
  });
}
