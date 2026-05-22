export const QueryKeys = {
  transactions: {
    all: ['transactions'] as const,
    feed: () => [...QueryKeys.transactions.all, 'feed'] as const,
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
};
