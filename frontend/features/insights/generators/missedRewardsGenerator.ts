import { InsightGenerator, InsightResult } from '../types/insight.types';
import { AlertTriangle } from 'lucide-react-native';

export const missedRewardsGenerator: InsightGenerator = ({ transactions: _transactions }) => {
  const insights: InsightResult[] = [];
  
  // A true missed rewards generator requires backend optimal-card historical checking.
  // For now, if a user flags a transaction manually or if we detect a suboptimal category (mocked).
  // In a real scenario, the backend `/transactions` would return an `optimal_card_id` and `missed_reward_value`.
  
  // We will simulate the structure here so the UI can consume it.
  
  // Example: Scan transactions from last 7 days for mock 'missed_reward' fields.
  let totalMissed = 0;
  
  // MOCK LOGIC: If backend supported it
  /*
  for (const tx of transactions) {
    if (tx.missed_reward_value > 0) {
      totalMissed += tx.missed_reward_value;
    }
  }
  */

  if (totalMissed > 100) {
    insights.push({
      id: `missed_rewards_weekly`,
      category: 'MISSED_REWARDS',
      priority: 'HIGH',
      confidence: 'ESTIMATED',
      title: 'MISSED REWARDS',
      description: `You missed approximately ₹${totalMissed} in rewards recently.`,
      reasoning: `Using optimal cards for your frequent categories could have yielded higher cashback.`,
      icon: AlertTriangle,
      color: '#EF4444', // Red
      monetaryValue: totalMissed,
    });
  }

  return insights;
};
