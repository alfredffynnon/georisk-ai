import { NextResponse } from "next/server";

import { COUNTRIES, type CountryCode } from "@/lib/countries";

export const dynamic = "force-dynamic";

type CountryIndicatorsRouteProps = {
  params: {
    countryCode: string;
  };
};

type Trend = "up" | "down" | "flat";

type WorldBankEntry = {
  date?: string;
  value?: number | string | null;
};

type WorldBankPayload = [unknown, WorldBankEntry[]?];

type FredObservation = {
  date?: string;
  value?: string;
};

type FredPayload = {
  observations?: FredObservation[];
};

type FredValue = {
  date?: string;
  value: number;
};

type IndicatorMetric = {
  value: number | null;
  year: string | null;
  trend: Trend;
  source: string;
};

type SnapshotMetric = {
  value: number | null;
  year: string | null;
  source: string;
};

const WORLD_BANK_BASE_URL = "https://api.worldbank.org/v2/country";
const FRED_BASE_URL =
  "https://api.stlouisfed.org/fred/series/observations";

export async function GET(
  _request: Request,
  { params }: CountryIndicatorsRouteProps,
) {
  const countryCode = params.countryCode.toUpperCase();

  if (!isCountryCode(countryCode)) {
    return NextResponse.json({ error: "Country not found." }, { status: 404 });
  }

  const country = COUNTRIES[countryCode];
  const fredApiKey = process.env.FRED_API_KEY;
  const shouldFetchFred = countryCode === "US" && Boolean(fredApiKey);

  const [
    gdpGrowthPayload,
    inflationPayload,
    debtToGdpPayload,
    fredFundsPayload,
    fredCpiPayload,
  ] = await Promise.all([
    fetchJson<WorldBankPayload>(
      getWorldBankUrl(country.wbCode, "NY.GDP.MKTP.KD.ZG"),
    ),
    fetchJson<WorldBankPayload>(
      getWorldBankUrl(country.wbCode, "FP.CPI.TOTL.ZG"),
    ),
    fetchJson<WorldBankPayload>(
      getWorldBankUrl(country.wbCode, "GC.DOD.TOTL.GD.ZS"),
    ),
    shouldFetchFred
      ? fetchJson<FredPayload>(getFredUrl("FEDFUNDS", fredApiKey ?? ""))
      : Promise.resolve(null),
    shouldFetchFred
      ? fetchJson<FredPayload>(getFredUrl("CPIAUCSL", fredApiKey ?? ""))
      : Promise.resolve(null),
  ]);

  const worldBankInflation = parseWorldBankIndicator(inflationPayload);
  const fredCpiFallback = parseFredCpiFallback(fredCpiPayload);

  return NextResponse.json({
    gdpGrowth: parseWorldBankIndicator(gdpGrowthPayload),
    inflation: worldBankInflation.value === null ? fredCpiFallback : worldBankInflation,
    debtToGdp: parseWorldBankSnapshot(debtToGdpPayload),
    interestRate: parseFredInterestRate(fredFundsPayload),
  });
}

function getWorldBankUrl(countryCode: string, indicator: string) {
  const url = new URL(
    `${WORLD_BANK_BASE_URL}/${countryCode}/indicator/${indicator}`,
  );
  url.searchParams.set("format", "json");
  url.searchParams.set("mrv", "2");

  return url;
}

function getFredUrl(seriesId: string, apiKey: string) {
  const url = new URL(FRED_BASE_URL);
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("limit", "2");
  url.searchParams.set("sort_order", "desc");

  return url;
}

async function fetchJson<T>(url: URL): Promise<T | null> {
  try {
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      console.error(`Indicator request failed: ${url.href} ${response.status}`);
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error("Indicator request failed:", error);
    return null;
  }
}

function parseWorldBankIndicator(
  payload: WorldBankPayload | null,
): IndicatorMetric {
  const [latest, previous] = getWorldBankValues(payload);

  return {
    value: latest?.value ?? null,
    year: latest?.year ?? null,
    trend: getTrend(latest?.value, previous?.value),
    source: "World Bank",
  };
}

function parseWorldBankSnapshot(
  payload: WorldBankPayload | null,
): SnapshotMetric {
  const [latest] = getWorldBankValues(payload);

  return {
    value: latest?.value ?? null,
    year: latest?.year ?? null,
    source: "World Bank",
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

function parseFredInterestRate(payload: FredPayload | null) {
  const latest = getFredValues(payload)[0];

  if (!latest) {
    return null;
  }

  return {
    value: latest.value,
    source: "FRED FEDFUNDS",
  };
}

function parseFredCpiFallback(
  payload: FredPayload | null,
): IndicatorMetric {
  const [latest, previous] = getFredValues(payload);

  if (!latest || !previous || previous.value === 0) {
    return {
      value: null,
      year: null,
      trend: "flat",
      source: "World Bank",
    };
  }

  return {
    value: ((latest.value - previous.value) / previous.value) * 100,
    year: latest.date?.slice(0, 4) ?? null,
    trend: getTrend(latest.value, previous.value),
    source: "FRED CPIAUCSL monthly change",
  };
}

function getFredValues(payload: FredPayload | null): FredValue[] {
  if (!payload?.observations) {
    return [];
  }

  return payload.observations.reduce<FredValue[]>((values, observation) => {
    const value = toNumber(observation.value);

    if (value !== null) {
      values.push({
        date: observation.date,
        value,
      });
    }

    return values;
  }, []);
}

function getTrend(
  latestValue: number | null | undefined,
  previousValue: number | null | undefined,
): Trend {
  if (latestValue === null || latestValue === undefined) {
    return "flat";
  }

  if (previousValue === null || previousValue === undefined) {
    return "flat";
  }

  const delta = latestValue - previousValue;

  if (Math.abs(delta) < 0.01) {
    return "flat";
  }

  return delta > 0 ? "up" : "down";
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === ".") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number.parseFloat(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function isCountryCode(countryCode: string): countryCode is CountryCode {
  return Object.prototype.hasOwnProperty.call(COUNTRIES, countryCode);
}
