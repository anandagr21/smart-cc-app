import { InsightGenerator, InsightResult } from '../types/insight.types';
import { Layers } from 'lucide-react-native';

export const portfolioGenerator: InsightGenerator = ({ cards }) => {
  const insights: InsightResult[] = [];
  
  if (cards.length < 2) return insights;

  // Simple heuristic: check for heavy cashback overlap
  let cashbackCards = 0;
  for (const card of cards) {
    if (!card.is_active) continue;
    const name = (card.nickname || card.card_details?.card_name || '').toLowerCase();
    if (name.includes('cashback') || name.includes('ace')) {
      cashbackCards++;
    }
  }

  if (cashbackCards >= 2) {
    insights.push({
      id: `portfolio_overlap_cashback`,
      category: 'PORTFOLIO_OPTIMIZATION',
      priority: 'INFORMATIONAL',
      confidence: 'MODERATE',
      title: 'PORTFOLIO OVERLAP',
      description: `Two or more of your cards overlap heavily in cashback rewards.`,
      reasoning: `Diversifying with a dedicated travel or dining card could improve your overall reward yield.`,
      icon: Layers,
      color: '#8B5CF6', // Purple
    });
  }

  return insights;
};
