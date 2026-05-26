import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const SYSTEM_PROMPT =
  "You are a senior geopolitical risk analyst. Given a client portfolio and a library of geopolitical scenarios and transmission mechanisms, produce a structured exposure brief. Be specific to the portfolio's sector, geography, and assets. Return ONLY valid JSON — no prose, no markdown, no code fences.";

type Portfolio = {
  id: string;
  user_id: string;
  name: string;
  sector: string | null;
  geography: string | null;
  assets: string | null;
  dependencies: string | null;
};

type ConfidenceLevel = "High" | "Medium" | "Low";

type ExposureBrief = {
  relevant_scenarios: string[];
  transmission_channels: string[];
  evidence: string[];
  confidence_levels: Record<string, ConfidenceLevel>;
  diligence_questions: string[];
  monitoring_triggers: string[];
  recommended_actions: string[];
};

const BRIEF_KEYS = [
  "relevant_scenarios",
  "transmission_channels",
  "evidence",
  "confidence_levels",
  "diligence_questions",
  "monitoring_triggers",
  "recommended_actions",
];

export async function POST(request: Request) {
  let portfolioId: string;

  try {
    const body = (await request.json()) as { portfolioId?: unknown };

    if (typeof body.portfolioId !== "string" || !body.portfolioId.trim()) {
      return NextResponse.json(
        { error: "portfolioId is required." },
        { status: 400 },
      );
    }

    portfolioId = body.portfolioId;
  } catch {
    return NextResponse.json(
      { error: "Invalid brief generation request." },
      { status: 400 },
    );
  }

  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: portfolio, error: portfolioError } = await supabase
    .from("portfolios")
    .select("id, user_id, name, sector, geography, assets, dependencies")
    .eq("id", portfolioId)
    .maybeSingle();

  if (portfolioError) {
    return NextResponse.json(
      { error: "Could not load portfolio." },
      { status: 500 },
    );
  }

  if (!portfolio || (portfolio as Portfolio).user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const [
    { data: scenarios, error: scenariosError },
    { data: transmissionMechanisms, error: transmissionMechanismsError },
  ] = await Promise.all([
    supabase.from("scenarios").select("*"),
    supabase.from("transmission_mechanisms").select("*"),
  ]);

  if (scenariosError || transmissionMechanismsError) {
    return NextResponse.json(
      { error: "Could not load risk library." },
      { status: 500 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Anthropic API key is not configured." },
      { status: 500 },
    );
  }

  let parsedBrief: ExposureBrief;

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 50000,
    });

    const message = await anthropic.messages.create({
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: buildUserMessage(
            portfolio as Portfolio,
            scenarios ?? [],
            transmissionMechanisms ?? [],
          ),
        },
      ],
      model: "claude-sonnet-4-6",
      system: SYSTEM_PROMPT,
    });

    const raw =
      message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let parsed: unknown;

    try {
      parsed = JSON.parse(cleaned);
    } catch (error) {
      console.error("Failed to parse AI response", { error, raw });

      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 },
      );
    }

    parsedBrief = parseExposureBrief(parsed);
  } catch {
    return NextResponse.json(
      { error: "Claude brief generation failed." },
      { status: 502 },
    );
  }

  const { error: insertError } = await supabase.from("exposure_briefs").insert({
    user_id: user.id,
    portfolio_id: portfolioId,
    brief_content: parsedBrief,
  });

  if (insertError) {
    return NextResponse.json(
      { error: "Could not save exposure brief." },
      { status: 500 },
    );
  }

  return NextResponse.json({ brief: parsedBrief });
}

function buildUserMessage(
  portfolio: Portfolio,
  scenarios: unknown[],
  transmissionMechanisms: unknown[],
) {
  return [
    `Portfolio: ${JSON.stringify({
      name: portfolio.name,
      sector: portfolio.sector,
      geography: portfolio.geography,
      assets: portfolio.assets,
      dependencies: portfolio.dependencies,
    })}.`,
    `Scenarios: ${JSON.stringify(scenarios)}.`,
    `Transmission mechanisms: ${JSON.stringify(transmissionMechanisms)}.`,
    "Return JSON with exactly these keys: relevant_scenarios (array of strings), transmission_channels (array), evidence (array), confidence_levels (object mapping risk name to High/Medium/Low), diligence_questions (array), monitoring_triggers (array), recommended_actions (array).",
  ].join("\n\n");
}

function parseExposureBrief(parsed: unknown): ExposureBrief {
  if (!isExposureBrief(parsed)) {
    throw new Error("Claude returned an invalid exposure brief shape.");
  }

  return parsed;
}

function isExposureBrief(value: unknown): value is ExposureBrief {
  if (!isRecord(value)) {
    return false;
  }

  const keys = Object.keys(value);

  return (
    keys.length === BRIEF_KEYS.length &&
    BRIEF_KEYS.every((key) => keys.includes(key)) &&
    isStringArray(value.relevant_scenarios) &&
    isStringArray(value.transmission_channels) &&
    isStringArray(value.evidence) &&
    isConfidenceLevels(value.confidence_levels) &&
    isStringArray(value.diligence_questions) &&
    isStringArray(value.monitoring_triggers) &&
    isStringArray(value.recommended_actions)
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isConfidenceLevels(
  value: unknown,
): value is Record<string, ConfidenceLevel> {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (level) => level === "High" || level === "Medium" || level === "Low",
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
