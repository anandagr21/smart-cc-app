import { InsightGenerator, InsightResult } from '../types/insight.types';
import { deriveFeeWaiverProgress } from '../../cards/utils/feeWaiver';
import { formatCurrencyIN } from '../../../utils/currency';
import { Activity } from 'lucide-react-native';

export const feeWaiverGenerator: InsightGenerator = ({ cards }) => {
  const insights: InsightResult[] = [];

  for (const card of cards) {
    if (!card.is_active) continue;

    const waiver = deriveFeeWaiverProgress(card);
    const cName = card.nickname || card.card_details?.card_name || 'Card';

    // High Priority: 75% to 99% complete (near waiver)
    if (waiver.hasWaiver && waiver.percentComplete >= 75 && waiver.percentComplete < 100) {
      insights.push({
        id: `fee_waiver_urgent_${card.id}`,
        category: 'FEE_WAIVER',
        priority: 'HIGH',
        confidence: 'HIGH',
        title: 'NEAR FEE WAIVER',
        description: `${formatCurrencyIN(waiver.remainingAmount)} more spend unlocks fee waiver on ${cName}.`,
        reasoning: `You have spent ${formatCurrencyIN(waiver.currentSpend)} of your ${formatCurrencyIN(waiver.target)} annual target.`,
        icon: Activity,
        color: '#F59E0B', // Warning/Amber
        monetaryValue: waiver.remainingAmount,
        relatedCardId: card.id,
      });
    }
    
    // Medium Priority: 50% to 74%
    if (waiver.hasWaiver && waiver.percentComplete >= 50 && waiver.percentComplete < 75) {
      insights.push({
        id: `fee_waiver_mid_${card.id}`,
        category: 'FEE_WAIVER',
        priority: 'MEDIUM',
        confidence: 'HIGH',
        title: 'FEE WAIVER PROGRESS',
        description: `You are halfway to your fee waiver on ${cName}.`,
        reasoning: `Consider putting large purchases on this card to clear the remaining ${formatCurrencyIN(waiver.remainingAmount)}.`,
        icon: Activity,
        color: '#0EA5E9',
        relatedCardId: card.id,
      });
    }
  }

  return insights;
};
