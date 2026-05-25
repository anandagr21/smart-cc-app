import { InsightGenerator, InsightResult } from '../types/insight.types';
import { Clock } from 'lucide-react-native';

export const underutilizedCardGenerator: InsightGenerator = ({ cards, transactions }) => {
  const insights: InsightResult[] = [];

  const now = new Date();
  
  for (const card of cards) {
    if (!card.is_active) continue;

    // Find the most recent transaction for this card
    const cardTxs = transactions.filter(t => t.user_card_id === card.id);
    let lastTxDate = new Date(0); // Epoch

    if (cardTxs.length > 0) {
      // Sort descending
      cardTxs.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
      lastTxDate = new Date(cardTxs[0].transaction_date);
    } else {
      // If no txs, it's very underutilized (unless just added)
      // For simplicity, we just assume it's underutilized if no txs exist.
    }

    const daysSinceUse = Math.floor((now.getTime() - lastTxDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // If not used in 45 days, and we have enough data (just a heuristic for now)
    if (daysSinceUse > 45) {
      const cName = card.nickname || card.card_details?.card_name || 'Card';
      insights.push({
        id: `underutilized_${card.id}`,
        category: 'UNDERUTILIZED_CARD',
        priority: 'MEDIUM',
        confidence: 'MODERATE',
        title: 'UNDERUTILIZED REWARDS',
        description: `You haven’t used ${cName} in ${daysSinceUse} days.`,
        reasoning: `Keeping premium cards inactive reduces your overall portfolio reward efficiency.`,
        icon: Clock,
        color: '#64748B', // Slate
        relatedCardId: card.id,
      });
    }
  }

  return insights;
};
