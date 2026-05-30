export interface RewardRuleResponse {
  id: string;
  card_id: string;
  rule_name: string;
  rule_type: string;
  priority: number;
  is_active: boolean;
  rule_config: Record<string, any>;
  created_at: string;
  updated_at: string | null;
}

export interface CardIntelligenceVersion {
  id: string;
  card_id: string;
  version: number;
  published_at: string;
  change_summary: Record<string, any>;
}
