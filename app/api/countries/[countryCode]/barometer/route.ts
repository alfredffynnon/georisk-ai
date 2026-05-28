import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import { COUNTRIES, type CountryCode } from "@/lib/countries";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

type CountryBarometerRouteProps = {
  params: {
    countryCode: string;
  };
};

type RiskLabel = "Stable" | "Guarded" | "Elevated" | "High" | "Critical";
type RiskTrend = "improving" | "stable" | "deteriorating";

type NewsApiArticle = {
  title?: string | null;
};

type BarometerAssessment = {
  level: number;
  label: RiskLabel;
  rationale: string;
  trend: RiskTrend;
};

const riskLabels = [
  "Stable",
  "Guarded",
  "Elevated",
  "High",
  "Critical",
] as const satisfies readonly RiskLabel[];

const riskTrends = [
  "improving",
  "stable",
  "deteriorating",
] as const satisfies readonly RiskTrend[];

export async function GET(
  _request: Request,
  { params }: CountryBarometerRouteProps,
) {
  try {
    const countryCode = params.countryCode.toUpperCase();

    if (!isCountryCode(countryCode)) {
      return NextResponse.json(
        { error: "Country not found." },
        { status: 404 },
      );
    }

    if (!process.env.NEWSAPI_KEY || !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Risk barometer is not configured." },
        { status: 500 },
      );
    }

    const articles = await fetchCountryArticles(countryCode);
    const assessment = await assessRisk(countryCode, articles);

    return NextResponse.json(assessment);
  } catch (error) {
    console.error("Country barometer error:", error);

    return NextResponse.json(
      { error: "Could not load risk barometer." },
      { status: 500 },
    );
  }
}

async function fetchCountryArticles(countryCode: CountryCode) {
  const country = COUNTRIES[countryCode];
  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", country.newsQuery);
  url.searchParams.set("language", "en");
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", "8");
  url.searchParams.set("apiKey", process.env.NEWSAPI_KEY ?? "");

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    console.error(`NewsAPI request failed for ${countryCode}: ${response.status}`);
    return [];
  }

  const payload = (await response.json().catch(() => null)) as {
    articles?: NewsApiArticle[];
  } | null;

  return (payload?.articles ?? []).filter((article) => Boolean(article.title));
}

async function assessRisk(countryCode: CountryCode, articles: NewsApiArticle[]) {
  const country = COUNTRIES[countryCode];
  const headlines = articles
    .map((article) => article.title)
    .filter(Boolean)
    .join("\n");
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: 45000,
  });

  const message = await anthropic.messages.create({
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Based on these recent headlines from ${country.name}, assess the current risk level.
Headlines: ${headlines}
Return ONLY JSON: { level: 1-5, label: 'Stable'|'Guarded'|'Elevated'|'High'|'Critical', rationale: string max 20 words, trend: 'improving'|'stable'|'deteriorating' }`,
      },
    ],
    model: "claude-sonnet-4-6",
    system: "You are a geopolitical risk analyst. Return only raw valid JSON.",
  });

  const content = message.content[0];
  const rawText = content?.type === "text" ? content.text : "";

  return parseBarometerAssessment(rawText);
}

function parseBarometerAssessment(rawText: string): BarometerAssessment {
  const cleanedText = cleanJsonText(rawText);

  try {
    const parsed = JSON.parse(cleanedText) as Partial<BarometerAssessment>;
    const level =
      typeof parsed.level === "number"
        ? parsed.level
        : Number.parseInt(String(parsed.level), 10);

    if (
      Number.isInteger(level) &&
      level >= 1 &&
      level <= 5 &&
      typeof parsed.rationale === "string" &&
      isRiskTrend(parsed.trend)
    ) {
      return {
        level,
        label: isRiskLabel(parsed.label) ? parsed.label : riskLabels[level - 1],
        rationale: limitWords(parsed.rationale, 20),
        trend: parsed.trend,
      };
    }
  } catch {
    console.error("Failed to parse country barometer JSON:", rawText);
  }

  return {
    level: 2,
    label: "Guarded",
    rationale: "Recent public signals require monitoring before risk direction is clear.",
    trend: "stable",
  };
}

function cleanJsonText(rawText: string) {
  return rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function limitWords(value: string, maxWords: number) {
  return value.trim().split(/\s+/).slice(0, maxWords).join(" ");
}

function isRiskLabel(label: unknown): label is RiskLabel {
  return typeof label === "string" && (riskLabels as readonly string[]).includes(label);
}

function isRiskTrend(trend: unknown): trend is RiskTrend {
  return typeof trend === "string" && (riskTrends as readonly string[]).includes(trend);
}

function isCountryCode(countryCode: string): countryCode is CountryCode {
  return Object.prototype.hasOwnProperty.call(COUNTRIES, countryCode);
}
