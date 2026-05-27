import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '../services/transactionService';
import { QueryKeys } from '@/features/core/api/queryKeys';
import { invalidateTransactionsAndWallet } from '@/features/core/api/queryUtils';

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactionId: string) => transactionService.deleteTransaction(transactionId),
    onSuccess: (_, deletedId) => {
      // 1. Optimistic Cache Patching
      queryClient.setQueryData(QueryKeys.transactions.feed(), (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;
        const newPages = oldData.pages.map((page: any) => ({
          ...page,
          data: page.data.filter((t: any) => t.id !== deletedId),
        }));
        return { ...oldData, pages: newPages };
      });

      // 2. Invalidate and refetch BOTH feed and wallet (for eventual consistency and aggregates updates)
      invalidateTransactionsAndWallet(queryClient);
    },
  });
}
