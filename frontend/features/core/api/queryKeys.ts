export const QueryKeys = {
  transactions: {
    all: ['transactions'] as const,
    feed: (filters?: { cardId?: string }) => [...QueryKeys.transactions.all, 'feed', ...(filters ? [filters] : [])] as const,
    byCard: (cardId: string) => [...QueryKeys.transactions.all, 'card', cardId] as const,
    detail: (transactionId: string) => [...QueryKeys.transactions.all, 'detail', transactionId] as const,
  },
  cards: {
    all: ['cards'] as const,
    wallet: () => [...QueryKeys.cards.all, 'wallet'] as const,
    intelligence: () => [...QueryKeys.cards.all, 'intelligence'] as const,
  },
  catalog: {
    all: ['catalog'] as const,
  },
  insights: {
    all: ['insights'] as const,
  },
};
