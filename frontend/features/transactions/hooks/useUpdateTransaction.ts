import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '../services/transactionService';
import { TransactionUpdate } from '../types/transaction.types';
import { QueryKeys } from '../../core/api/queryKeys';
import { invalidateTransactionsAndWallet } from '../../core/api/queryUtils';

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TransactionUpdate }) => 
      transactionService.updateTransaction(id, data),
    
    // We optionally patch simple local fields, but the backend handles aggregate and enrichments
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: QueryKeys.transactions.feed() });
      
      // Snapshot the previous value
      const previousTransactions = queryClient.getQueryData(QueryKeys.transactions.feed());
      
      // Optimistically update to the new value (only safe scalar fields)
      queryClient.setQueryData(QueryKeys.transactions.feed(), (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;
        
        const newPages = oldData.pages.map((page: any) => ({
          ...page,
          data: page.data.map((tx: any) => 
            tx.id === id 
              ? { 
                  ...tx, 
                  ...data, 
                  // Keep enrichment and aggregate values as they were, they will refresh soon
                }
              : tx
          )
        }));
        
        return { ...oldData, pages: newPages };
      });
      
      // Also optimistically patch detail if it exists
      const oldDetail = queryClient.getQueryData(QueryKeys.transactions.detail(id));
      if (oldDetail) {
          queryClient.setQueryData(QueryKeys.transactions.detail(id), {
              ...oldDetail as any,
              ...data
          });
      }

      // Return a context object with the snapshotted value
      return { previousTransactions };
    },
    
    onError: (err, newTransaction, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTransactions) {
        queryClient.setQueryData(QueryKeys.transactions.feed(), context.previousTransactions);
      }
    },
    
    onSuccess: (updatedTransaction) => {
      // 1. Authoritative cache replacement (immutable update)
      // This ensures the fully enriched DTO replaces the optimistic shell
      queryClient.setQueryData(QueryKeys.transactions.feed(), (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;
        
        const newPages = oldData.pages.map((page: any) => ({
          ...page,
          data: page.data.map((tx: any) => 
            tx.id === updatedTransaction.id ? updatedTransaction : tx
          )
        }));
        
        return { ...oldData, pages: newPages };
      });
      
      // Replace detail view entirely
      queryClient.setQueryData(QueryKeys.transactions.detail(updatedTransaction.id), updatedTransaction);

      // 2. Invalidate overarching summaries/wallet to pull new aggregates
      invalidateTransactionsAndWallet(queryClient);
    },
  });
}
