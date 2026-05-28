import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import { COUNTRIES, type CountryCode } from "@/lib/countries";
import { createClient } from "@/lib/supabase/server";
import type { CompanyProfile } from "@/lib/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

type NewsApiArticle = {
  source?: {
    name?: string | null;
  } | null;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  publishedAt?: string | null;
};

type ScoredArticle = {
  score: number;
  reason: string;
  category: SignalCategory;
};

type SignalCategory = "economic" | "political" | "jurisdiction" | "security";

type TaggedArticle = NewsApiArticle & {
  countryCode: CountryCode;
};

const signalCategories = [
  "economic",
  "political",
  "jurisdiction",
  "security",
] as const satisfies readonly SignalCategory[];

export async function GET() {
  try {
    if (!process.env.NEWSAPI_KEY || !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Signal intelligence is not configured." },
        { status: 500 },
      );
    }

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyProfile = profile as CompanyProfile;
    const countryCodes = getMonitoredCountryCodes(companyProfile.markets);
    const articlesByCountry = await Promise.all(
      countryCodes.map((countryCode) => fetchCountryArticles(countryCode)),
    );
    const articles = articlesByCountry.flat();
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 45000,
    });

    const scoredSignals = await Promise.all(
      articles.map((article) =>
        scoreArticleForProfile(anthropic, companyProfile, article),
      ),
    );

    const signals = scoredSignals
      .filter((signal): signal is NonNullable<typeof signal> => Boolean(signal))
      .filter((signal) => signal.score >= 3)
      .sort((firstSignal, secondSignal) => {
        if (secondSignal.score !== firstSignal.score) {
          return secondSignal.score - firstSignal.score;
        }

        return (
          new Date(secondSignal.publishedAt).getTime() -
          new Date(firstSignal.publishedAt).getTime()
        );
      });

    return NextResponse.json(signals);
  } catch (error) {
    console.error("Signal feed error:", error);

    return NextResponse.json(
      { error: "Could not load signal feed." },
      { status: 500 },
    );
  }
}

async function fetchCountryArticles(countryCode: CountryCode) {
  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", COUNTRIES[countryCode].newsQuery);
  url.searchParams.set("language", "en");
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", "5");
  url.searchParams.set("apiKey", process.env.NEWSAPI_KEY ?? "");

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    console.error(
      `NewsAPI request failed for ${countryCode}: ${response.status}`,
    );
    return [];
  }

  const payload = (await response.json().catch(() => null)) as {
    articles?: NewsApiArticle[];
  } | null;

  if (!payload?.articles) {
    return [];
  }

  return payload.articles
    .filter(
      (article) =>
        Boolean(article.title) &&
        Boolean(article.url) &&
        Boolean(article.publishedAt),
    )
    .map((article) => ({
      ...article,
      countryCode,
    }));
}

async function scoreArticleForProfile(
  anthropic: Anthropic,
  profile: CompanyProfile,
  article: TaggedArticle,
) {
  try {
    const message = await anthropic.messages.create({
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `Company: ${profile.company_name}. Industry: ${profile.industry_vertical}. Key assets: ${profile.key_assets ?? "Not specified"}. Supply chain: ${profile.supply_chain ?? "Not specified"}.
Article headline: ${article.title}. Summary: ${article.description ?? "No summary provided"}.
Rate relevance of this article to this company's risk exposure.
Return ONLY JSON: {score: 1-5, reason: string max 12 words, category: 'economic'|'political'|'jurisdiction'|'security'}`,
        },
      ],
      model: "claude-sonnet-4-6",
      system: "You are a geopolitical risk analyst. Return only raw valid JSON.",
    });

    const content = message.content[0];
    const rawText = content?.type === "text" ? content.text : "";
    const parsed = parseScoredArticle(rawText);

    if (!parsed) {
      return null;
    }

    const country = COUNTRIES[article.countryCode];

    return {
      title: article.title ?? "",
      description: article.description ?? "",
      url: article.url ?? "",
      source: article.source?.name ?? "Unknown source",
      publishedAt: article.publishedAt ?? "",
      countryCode: article.countryCode,
      countryName: country.name,
      countryFlag: country.flag,
      score: parsed.score,
      reason: parsed.reason,
      category: parsed.category,
    };
  } catch (error) {
    console.error("Article scoring failed:", error);
    return null;
  }
}

function parseScoredArticle(rawText: string): ScoredArticle | null {
  const cleanedText = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleanedText) as Partial<ScoredArticle>;
    const score =
      typeof parsed.score === "number"
        ? parsed.score
        : Number.parseInt(String(parsed.score), 10);
    const category = parsed.category;

    if (
      !Number.isFinite(score) ||
      score < 1 ||
      score > 5 ||
      typeof parsed.reason !== "string" ||
      !isSignalCategory(category)
    ) {
      return null;
    }

    return {
      score,
      reason: limitWords(parsed.reason, 12),
      category,
    };
  } catch {
    console.error("Failed to parse signal relevance JSON:", rawText);
    return null;
  }
}

function limitWords(value: string, maxWords: number) {
  return value.trim().split(/\s+/).slice(0, maxWords).join(" ");
}

function getMonitoredCountryCodes(markets: string[] | null) {
  const profileMarkets = Array.isArray(markets) ? markets : [];
  const countryCodes = [...profileMarkets, "US", "RU"]
    .map((countryCode) => countryCode.toUpperCase())
    .filter(isCountryCode);

  return Array.from(new Set(countryCodes));
}

function isCountryCode(countryCode: string): countryCode is CountryCode {
  return Object.prototype.hasOwnProperty.call(COUNTRIES, countryCode);
}

function isSignalCategory(
  category: ScoredArticle["category"] | undefined,
): category is SignalCategory {
  return (
    typeof category === "string" &&
    (signalCategories as readonly string[]).includes(category)
  );
}
