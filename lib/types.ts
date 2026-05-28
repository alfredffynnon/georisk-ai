export type RiskLabel = "Stable" | "Guarded" | "Elevated" | "High" | "Critical";

export interface CountryBriefScenario {
  name: string;
  description: string;
  base_case_probability: number;
  adverse_probability: number;
  client_impact: string;
}

export interface CountryBriefMetric {
  label: string;
  value: string;
  implication: string;
}

export interface CountryBriefTrigger {
  signal: string;
  threshold: string;
  action: string;
}

export interface CountryBriefAction {
  action: string;
  timeframe: "immediate" | "30-days" | "90-days";
  priority: "high" | "medium";
}

export interface BriefContent {
  risk_rating: {
    score: number;
    label: RiskLabel;
    summary: string;
  };
  scenarios: CountryBriefScenario[];
  transmission_channels: string[];
  economic_exposure: {
    narrative: string;
    key_metrics: CountryBriefMetric[];
  };
  diligence_questions: string[];
  monitoring_triggers: CountryBriefTrigger[];
  recommended_actions: CountryBriefAction[];
  sources_used: string[];
}

export interface CompanyProfile {
  id: string;
  user_id: string;
  company_name: string;
  industry_vertical: string;
  markets: string[];
  key_assets: string | null;
  supply_chain: string | null;
  currency_exposure: string[] | null;
  risk_appetite: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CountryBrief {
  id: string;
  user_id: string;
  company_profile_id: string;
  country_code: string;
  brief_content: BriefContent;
  created_at: string | null;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  country_code: string;
  role: "user" | "assistant";
  content: string;
  created_at: string | null;
}

export interface AlertSettings {
  id: string;
  user_id: string;
  country_code: string;
  enabled: boolean | null;
  rate_move_threshold: number | null;
  political_risk_level: string | null;
  jurisdiction_alerts: boolean | null;
  email_enabled: boolean | null;
  created_at: string | null;
}
