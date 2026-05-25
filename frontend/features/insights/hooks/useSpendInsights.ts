import { useMemo } from 'react';
import { useCards } from '../../cards/hooks/useCards';
import { useTransactions } from '../../transactions/hooks/useTransactions';
import { InsightEngine } from '../engine/InsightEngine';
import { feeWaiverGenerator } from '../generators/feeWaiverGenerator';
import { underutilizedCardGenerator } from '../generators/underutilizedCardGenerator';
import { portfolioGenerator } from '../generators/portfolioGenerator';
import { missedRewardsGenerator } from '../generators/missedRewardsGenerator';
import { InsightResult } from '../types/insight.types';

// Initialize singleton engine
const engine = new InsightEngine([
  feeWaiverGenerator,
  underutilizedCardGenerator,
  portfolioGenerator,
  missedRewardsGenerator,
]);

export function useSpendInsights() {
  const { data: cards = [], isLoading: cardsLoading } = useCards();
  const { data: txData, isLoading: txLoading } = useTransactions();

  const transactions = useMemo(() => {
    if (!txData || !txData.pages) return [];
    return txData.pages.flatMap((page: any) => page.data || []);
  }, [txData]);

  const insights = useMemo(() => {
    if (cardsLoading || txLoading) return [];
    return engine.generateInsights({ cards, transactions });
  }, [cards, transactions, cardsLoading, txLoading]);

  const getInsightForCard = (cardId: string): InsightResult | undefined => {
    // Return highest priority insight pointing specifically to this card
    return insights.find(i => i.relatedCardId === cardId);
  };

  const primaryInsight = insights.length > 0 ? insights[0] : null;

  return {
    insights,
    primaryInsight,
    getInsightForCard,
    isLoading: cardsLoading || txLoading,
  };
}
