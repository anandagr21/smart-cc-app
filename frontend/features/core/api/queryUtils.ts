import { QueryClient } from '@tanstack/react-query';
import { QueryKeys } from './queryKeys';

/**
 * Standardized invalidation helpers to ensure all related
 * queries are properly refreshed across the application.
 */

export const invalidateTransactionFeed = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QueryKeys.transactions.all });
};

export const invalidateWalletIntelligence = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QueryKeys.cards.all });
};

export const invalidateTransactionsAndWallet = (queryClient: QueryClient) => {
  // When a transaction is added/edited, both the feed and the wallet (which holds spend aggregates) are stale
  invalidateTransactionFeed(queryClient);
  invalidateWalletIntelligence(queryClient);
};

export const invalidateCatalog = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: QueryKeys.catalog.all });
};
