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
  // If the backend actually gives us a target in the future, we can seamlessly switch here:
  // const realTarget = card.fee_waiver_threshold;
  
  // TEMPORARY PRODUCT ASSUMPTION: Target is current spend + 20,000
  const currentSpend = Number(card.current_spend) || 0;
  const target = currentSpend + 20000;
  const remainingAmount = 20000;
  
  const percentComplete = Math.min((currentSpend / target) * 100, 100);
  
  let milestone = 'Good Start';
  if (percentComplete >= 90) {
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
    hasWaiver: true, // Always show it temporarily for premium UX
    target,
    currentSpend,
    remainingAmount,
    percentComplete,
    milestone,
  };
}
