import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

import { COUNTRIES, type CountryCode } from "@/lib/countries";
import {
  fetchRecentCountryArticles,
  fetchWorldBankEconomicIndicators,
  type CountryEconomicIndicators,
  type NewsApiArticle,
} from "@/lib/country-data";
import { createClient } from "@/lib/supabase/server";
import type { BriefContent, CompanyProfile } from "@/lib/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

type CountryBriefRouteProps = {
  params: {
    countryCode: string;
  };
};

const systemPrompt =
  "You are a senior geopolitical risk analyst at a top-tier political risk consultancy. Your briefs are used by investment committees at infrastructure funds and private credit managers to make capital allocation decisions. Write with the authority and precision of a Control Risks or Oxford Analytica report. Every claim must reference a specific source or data point. Return only raw valid JSON — no markdown, no fences.";

export async function POST(
  _request: NextRequest,
  { params }: CountryBriefRouteProps,
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("company_profiles")
      .select("*")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Company profile required." },
        { status: 403 },
      );
    }

    const countryCode = params.countryCode.toUpperCase();

    if (!isCountryCode(countryCode)) {
      return NextResponse.json({ error: "Country not found." }, { status: 404 });
    }

    if (!process.env.NEWSAPI_KEY || !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Country brief generation is not configured." },
        { status: 500 },
      );
    }

    const [articles, indicators] = await Promise.all([
      fetchRecentCountryArticles(countryCode, 15, 48),
      fetchWorldBankEconomicIndicators(countryCode),
    ]);

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 50000,
    });

    const message = await anthropic.messages.create({
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: buildBriefPrompt(
            profile as CompanyProfile,
            countryCode,
            articles,
            indicators,
          ),
        },
      ],
      model: "claude-sonnet-4-6",
      system: systemPrompt,
    });

    const content = message.content[0];
    const rawText = content?.type === "text" ? content.text : "";
    const parsedContent = parseBriefContent(rawText);

    if (!parsedContent) {
      console.error("Failed to parse country brief JSON:", rawText);

      return NextResponse.json(
        { error: "Failed to parse analyst brief." },
        { status: 500 },
      );
    }

    const generatedAt = new Date().toISOString();
    const { data: insertedBrief, error: insertError } = await supabase
      .from("country_briefs")
      .insert({
        brief_content: parsedContent,
        company_profile_id: profile.id,
        country_code: countryCode,
        user_id: user.id,
      })
      .select("created_at")
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      brief: parsedContent,
      generatedAt: insertedBrief?.created_at ?? generatedAt,
    });
  } catch (error) {
    console.error("Country brief generation error:", error);

    return NextResponse.json(
      { error: "Brief generation failed." },
      { status: 500 },
    );
  }
}

function buildBriefPrompt(
  profile: CompanyProfile,
  countryCode: CountryCode,
  articles: NewsApiArticle[],
  indicators: CountryEconomicIndicators,
) {
  const country = COUNTRIES[countryCode];
  const articleLines =
    articles.length > 0
      ? articles
          .map(
            (article) =>
              `- ${article.source.name} (${article.publishedAt}): ${article.title}. ${article.description}`,
          )
          .join("\n")
      : "- No qualifying NewsAPI articles were returned in the last 48 hours.";

  return `Produce an intelligence brief for the following client.

CLIENT PROFILE:
Company: ${profile.company_name}
Industry: ${profile.industry_vertical}  
Key Assets: ${profile.key_assets ?? "Not specified"}
Supply Chain Dependencies: ${profile.supply_chain ?? "Not specified"}
Currency Exposure: ${formatCurrencyExposure(profile.currency_exposure)}
Risk Appetite: ${profile.risk_appetite ?? "Not specified"}

COUNTRY: ${country.name} (${countryCode})

RECENT INTELLIGENCE (last 48 hours):
${articleLines}

ECONOMIC DATA:
- GDP Growth: ${formatIndicator(indicators.gdpGrowth)} (${formatIndicatorYear(indicators.gdpGrowth)})
- Inflation: ${formatIndicator(indicators.inflation)} (${formatIndicatorYear(indicators.inflation)})
- Debt/GDP: ${formatIndicator(indicators.debtToGdp)} (${formatIndicatorYear(indicators.debtToGdp)})

Return ONLY a JSON object with these exact keys:
{
  risk_rating: { score: 1-5, label: 'Stable'|'Guarded'|'Elevated'|'High'|'Critical', summary: string 2 sentences },
  scenarios: [ { name: string, description: string, base_case_probability: number, adverse_probability: number, client_impact: string } ] (3 scenarios),
  transmission_channels: [ string ] (4-5 specific channels from country events to client's named assets),
  economic_exposure: { narrative: string 2-3 sentences referencing actual data points, key_metrics: [ {label: string, value: string, implication: string} ] },
  diligence_questions: [ string ] (5 questions the client should be asking their counterparties),
  monitoring_triggers: [ { signal: string, threshold: string, action: string } ] (4 triggers),
  recommended_actions: [ { action: string, timeframe: 'immediate'|'30-days'|'90-days', priority: 'high'|'medium' } ] (4-5 actions),
  sources_used: [ string ] (list of publication names cited)
}`;
}

function parseBriefContent(rawText: string): BriefContent | null {
  const cleanedText = cleanJsonText(rawText);

  try {
    return JSON.parse(cleanedText) as BriefContent;
  } catch {
    const startIndex = cleanedText.indexOf("{");
    const endIndex = cleanedText.lastIndexOf("}");

    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
      return null;
    }

    try {
      return JSON.parse(cleanedText.slice(startIndex, endIndex + 1)) as BriefContent;
    } catch {
      return null;
    }
  }
}

function cleanJsonText(rawText: string) {
  return rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function formatCurrencyExposure(currencyExposure: string[] | null) {
  if (!Array.isArray(currencyExposure) || currencyExposure.length === 0) {
    return "Not specified";
  }

  return currencyExposure.join(", ");
}

function formatIndicator(metric: { value: number | null }) {
  return metric.value === null ? "Not available" : `${metric.value.toFixed(1)}%`;
}

function formatIndicatorYear(metric: { year: string | null }) {
  return metric.year ?? "year not available";
}

function isCountryCode(countryCode: string): countryCode is CountryCode {
  return Object.prototype.hasOwnProperty.call(COUNTRIES, countryCode);
}
