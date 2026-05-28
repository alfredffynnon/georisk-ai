export interface BriefContent {
  country_summary: string;
  relevant_scenarios: string[];
  transmission_channels: string[];
  economic_exposure: string;
  diligence_questions: string[];
  monitoring_triggers: string[];
  recommended_actions: string[];
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
