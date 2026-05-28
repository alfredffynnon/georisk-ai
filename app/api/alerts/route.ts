import { NextRequest, NextResponse } from "next/server";

import { COUNTRIES, type CountryCode } from "@/lib/countries";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

type PoliticalRiskLevel = "1" | "2" | "3" | "4" | "5";

type AlertSettingsRow = {
  country_code: CountryCode;
  enabled: boolean;
  rate_move_threshold: number;
  political_risk_level: PoliticalRiskLevel;
  email_enabled: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await parseJson(request);

    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: "Expected an array of alert settings." },
        { status: 400 },
      );
    }

    const parsedSettings = body.map(parseAlertSettings);
    const invalidSetting = parsedSettings.find(
      (settings) => "error" in settings,
    );

    if (invalidSetting && "error" in invalidSetting) {
      return NextResponse.json(
        { error: invalidSetting.error },
        { status: 400 },
      );
    }

    const rows = (parsedSettings as AlertSettingsRow[]).map((settings) => ({
      ...settings,
      user_id: user.id,
    }));

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "At least one alert setting is required." },
        { status: 400 },
      );
    }

    const { error: upsertError } = await supabase
      .from("alert_settings")
      .upsert(rows, {
        onConflict: "user_id,country_code",
      });

    if (upsertError) {
      throw upsertError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Alert settings error:", error);

    return NextResponse.json(
      { error: "Could not save alert settings." },
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

function parseAlertSettings(
  value: unknown,
): AlertSettingsRow | { error: string } {
  if (!isRecord(value)) {
    return { error: "Each alert setting must be an object." };
  }

  const countryCode = parseCountryCode(value.country_code);
  const politicalRiskLevel = parsePoliticalRiskLevel(
    value.political_risk_level,
  );
  const rateMoveThreshold = parseRateMoveThreshold(
    value.rate_move_threshold,
  );

  if (!countryCode) {
    return { error: "A valid country code is required." };
  }

  if (!politicalRiskLevel) {
    return {
      error:
        "Political risk level must be 1, 2, 3, 4, 5 or a matching risk label.",
    };
  }

  if (rateMoveThreshold === null) {
    return { error: "Rate move threshold must be a positive number." };
  }

  return {
    country_code: countryCode,
    email_enabled: parseBoolean(value.email_enabled, true),
    enabled: parseBoolean(value.enabled, true),
    political_risk_level: politicalRiskLevel,
    rate_move_threshold: rateMoveThreshold,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseCountryCode(value: unknown): CountryCode | null {
  if (typeof value !== "string") {
    return null;
  }

  const countryCode = value.toUpperCase();

  return Object.prototype.hasOwnProperty.call(COUNTRIES, countryCode)
    ? (countryCode as CountryCode)
    : null;
}

function parseBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function parsePoliticalRiskLevel(
  value: unknown,
): PoliticalRiskLevel | null {
  const normalizedValue = String(value ?? "").toLowerCase();

  if (normalizedValue === "1" || normalizedValue === "stable") {
    return "1";
  }

  if (normalizedValue === "2" || normalizedValue === "guarded") {
    return "2";
  }

  if (normalizedValue === "3" || normalizedValue === "elevated") {
    return "3";
  }

  if (normalizedValue === "4" || normalizedValue === "high") {
    return "4";
  }

  if (normalizedValue === "5" || normalizedValue === "critical") {
    return "5";
  }

  return null;
}

function parseRateMoveThreshold(value: unknown) {
  const threshold = typeof value === "number" ? value : Number(value);

  return Number.isFinite(threshold) && threshold > 0 ? threshold : null;
}
