import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const allowedMarkets = ["DE", "GB", "AE"] as const;
const globalContextMarkets = ["US", "RU"] as const;
const allowedCurrencies = ["USD", "EUR", "GBP", "AED", "RUB"] as const;
const allowedIndustryVerticals = [
  "Energy & Infrastructure",
  "Private Credit",
  "Commodities Trading",
  "Real Estate",
  "Asset Management",
  "Other",
] as const;

const riskAppetiteMap = {
  Conservative: "low",
  Moderate: "medium",
  Aggressive: "high",
} as const;

type MarketCode = (typeof allowedMarkets)[number];
type CurrencyCode = (typeof allowedCurrencies)[number];
type IndustryVertical = (typeof allowedIndustryVerticals)[number];
type RiskAppetite = keyof typeof riskAppetiteMap;

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: existingProfile, error: profileLookupError } = await supabase
      .from("company_profiles")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (profileLookupError) {
      throw profileLookupError;
    }

    if (existingProfile) {
      return NextResponse.json({ exists: true });
    }

    const body = await parseJson(request);

    if (!isRecord(body)) {
      return NextResponse.json(
        { error: "Invalid onboarding payload." },
        { status: 400 },
      );
    }

    const companyName = cleanRequiredText(body.companyName);
    const industryVertical = parseIndustryVertical(body.industryVertical);
    const selectedMarkets = parseMarkets(body.markets);
    const keyAssets = cleanRequiredText(body.keyAssets);
    const supplyChain = cleanOptionalText(body.supplyChain);
    const currencyExposure = parseCurrencyExposure(body.currencyExposure);
    const riskAppetite = parseRiskAppetite(body.riskAppetite);

    if (!companyName) {
      return NextResponse.json(
        { error: "Company or fund name is required." },
        { status: 400 },
      );
    }

    if (!industryVertical) {
      return NextResponse.json(
        { error: "Industry vertical is required." },
        { status: 400 },
      );
    }

    if (selectedMarkets.length === 0) {
      return NextResponse.json(
        { error: "Select at least one operating market." },
        { status: 400 },
      );
    }

    if (!keyAssets) {
      return NextResponse.json(
        { error: "Key assets are required." },
        { status: 400 },
      );
    }

    if (!riskAppetite) {
      return NextResponse.json(
        { error: "Risk appetite is required." },
        { status: 400 },
      );
    }

    const markets = Array.from(
      new Set([...selectedMarkets, ...globalContextMarkets]),
    );

    const { data: insertedProfile, error: insertError } = await supabase
      .from("company_profiles")
      .insert({
        company_name: companyName,
        currency_exposure: currencyExposure,
        industry_vertical: industryVertical,
        key_assets: keyAssets,
        markets,
        risk_appetite: riskAppetiteMap[riskAppetite],
        supply_chain: supplyChain,
        user_id: user.id,
      })
      .select("id")
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      profileId: insertedProfile.id,
    });
  } catch (error) {
    console.error("Onboarding error:", error);

    return NextResponse.json(
      { error: "Could not activate intelligence." },
      { status: 500 },
    );
  }
}

async function parseJson(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanRequiredText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function cleanOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function parseIndustryVertical(value: unknown): IndustryVertical | null {
  return typeof value === "string" &&
    (allowedIndustryVerticals as readonly string[]).includes(value)
    ? (value as IndustryVertical)
    : null;
}

function parseMarkets(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniqueValues(value.filter(isMarketCode));
}

function parseCurrencyExposure(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniqueValues(value.filter(isCurrencyCode));
}

function parseRiskAppetite(value: unknown): RiskAppetite | null {
  return typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(riskAppetiteMap, value)
    ? (value as RiskAppetite)
    : null;
}

function isMarketCode(value: unknown): value is MarketCode {
  return (
    typeof value === "string" &&
    (allowedMarkets as readonly string[]).includes(value)
  );
}

function isCurrencyCode(value: unknown): value is CurrencyCode {
  return (
    typeof value === "string" &&
    (allowedCurrencies as readonly string[]).includes(value)
  );
}

function uniqueValues<Value extends string>(values: Value[]) {
  return Array.from(new Set(values));
}
