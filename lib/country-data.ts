import { COUNTRIES, type CountryCode } from "@/lib/countries";

export type NewsApiArticle = {
  source: {
    name: string;
  };
  title: string;
  description: string;
  url: string;
  publishedAt: string;
};

export type IndicatorMetric = {
  value: number | null;
  year: string | null;
  source: string;
};

export type CountryEconomicIndicators = {
  gdpGrowth: IndicatorMetric;
  inflation: IndicatorMetric;
  debtToGdp: IndicatorMetric;
};

type RawNewsApiArticle = {
  source?: {
    name?: string | null;
  } | null;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  publishedAt?: string | null;
};

type WorldBankEntry = {
  date?: string;
  value?: number | string | null;
};

type WorldBankPayload = [unknown, WorldBankEntry[]?];

const WORLD_BANK_BASE_URL = "https://api.worldbank.org/v2/country";

export async function fetchRecentCountryArticles(
  countryCode: CountryCode,
  pageSize: number,
  lastHours?: number,
) {
  const country = COUNTRIES[countryCode];
  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", country.newsQuery);
  url.searchParams.set("language", "en");
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", String(pageSize));
  url.searchParams.set("apiKey", process.env.NEWSAPI_KEY ?? "");

  if (lastHours) {
    const fromDate = new Date(Date.now() - lastHours * 60 * 60 * 1000);
    url.searchParams.set("from", fromDate.toISOString());
  }

  try {
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      console.error(`NewsAPI request failed for ${countryCode}: ${response.status}`);
      return [];
    }

    const payload = (await response.json().catch(() => null)) as {
      articles?: RawNewsApiArticle[];
    } | null;

    return (payload?.articles ?? []).reduce<NewsApiArticle[]>((articles, article) => {
      if (!article.title || !article.url || !article.publishedAt) {
        return articles;
      }

      articles.push({
        description: article.description ?? "",
        publishedAt: article.publishedAt,
        source: {
          name: article.source?.name ?? "Unknown source",
        },
        title: article.title,
        url: article.url,
      });

      return articles;
    }, []);
  } catch (error) {
    console.error(`NewsAPI request failed for ${countryCode}:`, error);
    return [];
  }
}

export async function fetchWorldBankEconomicIndicators(
  countryCode: CountryCode,
): Promise<CountryEconomicIndicators> {
  const country = COUNTRIES[countryCode];
  const [gdpGrowthPayload, inflationPayload, debtToGdpPayload] =
    await Promise.all([
      fetchWorldBankJson(getWorldBankUrl(country.wbCode, "NY.GDP.MKTP.KD.ZG")),
      fetchWorldBankJson(getWorldBankUrl(country.wbCode, "FP.CPI.TOTL.ZG")),
      fetchWorldBankJson(getWorldBankUrl(country.wbCode, "GC.DOD.TOTL.GD.ZS")),
    ]);

  return {
    debtToGdp: parseWorldBankSnapshot(debtToGdpPayload),
    gdpGrowth: parseWorldBankSnapshot(gdpGrowthPayload),
    inflation: parseWorldBankSnapshot(inflationPayload),
  };
}

function getWorldBankUrl(countryCode: string, indicator: string) {
  const url = new URL(
    `${WORLD_BANK_BASE_URL}/${countryCode}/indicator/${indicator}`,
  );
  url.searchParams.set("format", "json");
  url.searchParams.set("mrv", "2");

  return url;
}

async function fetchWorldBankJson(url: URL) {
  try {
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      console.error(`World Bank request failed: ${url.href} ${response.status}`);
      return null;
    }

    return (await response.json()) as WorldBankPayload;
  } catch (error) {
    console.error("World Bank request failed:", error);
    return null;
  }
}

function parseWorldBankSnapshot(
  payload: WorldBankPayload | null,
): IndicatorMetric {
  const latest = getWorldBankValues(payload)[0];

  return {
    source: "World Bank",
    value: latest?.value ?? null,
    year: latest?.year ?? null,
  };
}

function getWorldBankValues(payload: WorldBankPayload | null) {
  if (!Array.isArray(payload) || !Array.isArray(payload[1])) {
    return [];
  }

  return payload[1]
    .map((entry) => ({
      year: entry.date ?? null,
      value: toNumber(entry.value),
    }))
    .filter(
      (entry): entry is { year: string | null; value: number } =>
        entry.value !== null,
    );
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === ".") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number.parseFloat(value);

  return Number.isFinite(parsed) ? parsed : null;
}
