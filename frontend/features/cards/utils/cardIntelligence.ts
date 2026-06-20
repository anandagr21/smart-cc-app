import { UserCardResponse } from '../types/api';
import { deriveFeeWaiverProgress } from './feeWaiver';

import { DynamicIcon } from '@/components/DynamicIcon';

export interface CardIntelligenceInsight {
  label: string;
  icon: LucideIcon;
  color: string;
}

export function derivePrimaryInsight(card: UserCardResponse, colors: any): CardIntelligenceInsight {
  // 1. Near Fee Waiver
  const waiver = deriveFeeWaiverProgress(card);
  if (waiver.hasWaiver && waiver.percentComplete >= 75 && waiver.percentComplete < 100) {
    return { label: 'NEAR WAIVER', icon: Activity, color: colors.warning };
  }
  if (waiver.percentComplete >= 100) {
    return { label: 'WAIVER ACHIEVED', icon: CheckCircle2, color: colors.success };
  }

  const cName = (card.nickname || card.card_details?.card_name || '').toLowerCase();

  // 2. Strong Reward Category Fit
  if (cName.includes('travel') || cName.includes('miles') || cName.includes('club')) {
    return { label: 'TRAVEL PICK', icon: Plane, color: '#0EA5E9' };
  }
  if (cName.includes('cashback') || cName.includes('ace')) {
    return { label: 'ONLINE REWARDS', icon: ShoppingBag, color: '#10B981' };
  }
  if (cName.includes('dine') || cName.includes('swiggy') || cName.includes('zomato')) {
    return { label: 'DINING BENEFITS', icon: Utensils, color: '#EC4899' };
  }
  if (cName.includes('fuel') || cName.includes('petro')) {
    return { label: 'FUEL OPTIMIZED', icon: Fuel, color: '#F59E0B' };
  }

  // 3 & 4. Most Used / Highest Spend
  if (card.annual_spend > 100000) {
    return { label: 'HIGHEST SPEND', icon: Zap, color: colors.primary };
  }
  if (card.annual_spend > 25000) {
    return { label: 'MOST USED', icon: Zap, color: colors.primary };
  }

  // 5. Fallback
  return { label: 'ACTIVE & READY', icon: CheckCircle2, color: colors.textSecondary };
}
