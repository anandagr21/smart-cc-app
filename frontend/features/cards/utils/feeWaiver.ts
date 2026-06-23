import { UserCardResponse } from '../types/api';

export interface FeeWaiverPresentation {
  hasWaiver: boolean;
  target: number;
  currentSpend: number;
  remainingAmount: number;
  percentComplete: number;
  milestone: string;
}

export function deriveFeeWaiverProgress(card: UserCardResponse): FeeWaiverPresentation {
  const target = Number(card.effective_fee_waiver_threshold) || 0;
  
  if (target <= 0 || isNaN(target)) {
    return {
      hasWaiver: false,
      target: 0,
      currentSpend: 0,
      remainingAmount: 0,
      percentComplete: 0,
      milestone: 'No Waiver',
    };
  }

  const currentSpend = Number(card.annual_spend) || 0;
  const remainingAmount = Math.max(0, target - currentSpend);
  const percentComplete = Math.min((currentSpend / target) * 100, 100);
  
  let milestone = 'Good Start';
  if (percentComplete >= 100) {
    milestone = 'Waiver Achieved';
  } else if (percentComplete >= 90) {
    milestone = 'Almost Unlocked';
  } else if (percentComplete >= 75) {
    milestone = 'Near Waiver';
  } else if (percentComplete >= 50) {
    milestone = 'Halfway There';
  } else if (percentComplete >= 25) {
    milestone = 'Building Progress';
  } else {
    milestone = 'Good Start';
  }

  return {
    hasWaiver: true,
    target,
    currentSpend,
    remainingAmount,
    percentComplete,
    milestone,
  };
}
