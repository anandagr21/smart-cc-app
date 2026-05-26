import { InsightResult, InsightPriority } from '../types/insight.types';

const PRIORITY_WEIGHTS: Record<InsightPriority, number> = {
  URGENT: 4000,
  HIGH: 3000,
  MEDIUM: 2000,
  INFORMATIONAL: 1000,
};

/**
 * Prioritizes insights based on urgency and monetary impact.
 * Rules:
 * 1. HIGH priority always beats MEDIUM and INFORMATIONAL.
 * 2. Within the same priority, higher monetaryValue wins.
 * 3. Ties fallback to stable sorting based on category defaults.
 */
export function prioritizeInsights(insights: InsightResult[]): InsightResult[] {
  return [...insights].sort((a, b) => {
    // 1. Priority Weight
    const weightA = PRIORITY_WEIGHTS[a.priority] || 0;
    const weightB = PRIORITY_WEIGHTS[b.priority] || 0;

    if (weightA !== weightB) {
      return weightB - weightA;
    }

    // 2. Monetary Value Tiebreaker (if applicable)
    const valA = a.monetary_value || 0;
    const valB = b.monetary_value || 0;

    if (valA !== valB) {
      return valB - valA; // Higher monetary value wins
    }

    // 3. Fallback (stable enough for now)
    return 0;
  });
}
