export enum ConfidenceLevel {
  STRONG_TREND = "STRONG_TREND",
  MODERATE_TREND = "MODERATE_TREND",
  EARLY_SIGNAL = "EARLY_SIGNAL",
}

export enum NarrativeType {
  IMPROVEMENT = "IMPROVEMENT",
  INEFFICIENCY = "INEFFICIENCY",
  PORTFOLIO = "PORTFOLIO",
  MILESTONE = "MILESTONE",
}

export interface Narrative {
  id: string;
  type: NarrativeType;
  text: string;
  confidence: ConfidenceLevel;
  reasoning: string;
  novelty_group: string;
}

export interface Forecast {
  id: string;
  text: string;
  confidence: ConfidenceLevel;
  reasoning: string;
  target_metric: string;
}

export interface Streak {
  id: string;
  text: string;
  count: number;
  metric: string;
  reasoning: string;
}

export interface MonthlySummaryResponse {
  period: string; // e.g. "2026-05"
  total_rewards_optimized: number;
  missed_opportunity_value: number;
  optimization_rate: number;
  strongest_category?: string;
  strongest_card?: string;
  improvement_delta: number;
  streaks: Streak[];
  narratives: Narrative[];
  forecasts: Forecast[];
  supporting_metrics: Record<string, any>;
}
