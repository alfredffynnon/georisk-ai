import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import { COUNTRIES, type CountryCode } from "@/lib/countries";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

type CountryNewsRouteProps = {
  params: {
    countryCode: string;
  };
};

type RiskCategory = "economic" | "political" | "jurisdiction" | "security";

type NewsApiArticle = {
  source?: {
    name?: string | null;
  } | null;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  urlToImage?: string | null;
  publishedAt?: string | null;
};

type ArticleClassification = {
  index: number;
  category: RiskCategory;
  importance: 1 | 2 | 3;
};

const riskCategories = [
  "economic",
  "political",
  "jurisdiction",
  "security",
] as const satisfies readonly RiskCategory[];

export async function GET(
  _request: Request,
  { params }: CountryNewsRouteProps,
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
        { error: "Country news is not configured." },
        { status: 500 },
      );
    }

    const articles = await fetchCountryArticles(countryCode, 20);

    if (articles.length === 0) {
      return NextResponse.json([]);
    }

    const classifications = await classifyArticles(articles);
    const classificationsByIndex = new Map(
      classifications.map((classification) => [
        classification.index,
        classification,
      ]),
    );

    const mergedArticles = articles
      .map((article, index) => {
        const classification = classificationsByIndex.get(index);

        return {
          title: article.title ?? "",
          description: article.description ?? "",
          url: article.url ?? "",
          source: {
            name: article.source?.name ?? "Unknown source",
          },
          publishedAt: article.publishedAt ?? "",
          category: classification?.category ?? "political",
          importance: classification?.importance ?? 1,
          urlToImage: article.urlToImage ?? null,
        };
      })
      .sort((firstArticle, secondArticle) => {
        if (secondArticle.importance !== firstArticle.importance) {
          return secondArticle.importance - firstArticle.importance;
        }

        return (
          new Date(secondArticle.publishedAt).getTime() -
          new Date(firstArticle.publishedAt).getTime()
        );
      });

    return NextResponse.json(mergedArticles);
  } catch (error) {
    console.error("Country news error:", error);

    return NextResponse.json(
      { error: "Could not load country news." },
      { status: 500 },
    );
  }
}

async function fetchCountryArticles(countryCode: CountryCode, pageSize: number) {
  const country = COUNTRIES[countryCode];
  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", country.newsQuery);
  url.searchParams.set("language", "en");
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", String(pageSize));
  url.searchParams.set("apiKey", process.env.NEWSAPI_KEY ?? "");

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    console.error(`NewsAPI request failed for ${countryCode}: ${response.status}`);
    return [];
  }

  const payload = (await response.json().catch(() => null)) as {
    articles?: NewsApiArticle[];
  } | null;

  return (payload?.articles ?? []).filter(
    (article) =>
      Boolean(article.title) &&
      Boolean(article.url) &&
      Boolean(article.publishedAt),
  );
}

async function classifyArticles(articles: NewsApiArticle[]) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: 45000,
  });

  const articleList = articles
    .map((article, index) => `${index}: ${article.title ?? "Untitled"}`)
    .join("\n");

  const message = await anthropic.messages.create({
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Classify these news articles. For each return its index, category ('economic'|'political'|'jurisdiction'|'security'), and importance (1-3 where 3=high).
Articles: ${articleList}
Return ONLY a JSON array: [{index, category, importance}]`,
      },
    ],
    model: "claude-sonnet-4-6",
    system: "You are a geopolitical risk analyst. Return only raw valid JSON.",
  });

  const content = message.content[0];
  const rawText = content?.type === "text" ? content.text : "";

  return parseArticleClassifications(rawText);
}

function parseArticleClassifications(rawText: string) {
  const cleanedText = cleanJsonText(rawText);

  try {
    const parsed = JSON.parse(cleanedText) as Partial<ArticleClassification>[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((classification) => {
        const index =
          typeof classification.index === "number"
            ? classification.index
            : Number.parseInt(String(classification.index), 10);
        const importance =
          typeof classification.importance === "number"
            ? classification.importance
            : Number.parseInt(String(classification.importance), 10);
        const category = classification.category;

        if (
          !Number.isInteger(index) ||
          index < 0 ||
          !isRiskCategory(category) ||
          !isImportance(importance)
        ) {
          return null;
        }

        return {
          index,
          category,
          importance,
        };
      })
      .filter(
        (
          classification,
        ): classification is ArticleClassification => classification !== null,
      );
  } catch {
    console.error("Failed to parse country news classification JSON:", rawText);
    return [];
  }
}

function cleanJsonText(rawText: string) {
  return rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function isImportance(value: number): value is 1 | 2 | 3 {
  return value === 1 || value === 2 || value === 3;
}

function isRiskCategory(
  category: Partial<ArticleClassification>["category"] | undefined,
): category is RiskCategory {
  return (
    typeof category === "string" &&
    (riskCategories as readonly string[]).includes(category)
  );
}

function isCountryCode(countryCode: string): countryCode is CountryCode {
  return Object.prototype.hasOwnProperty.call(COUNTRIES, countryCode);
}
