import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const urgencyOptions = ["standard", "priority", "emergency"] as const;

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

    if (!isRecord(body)) {
      return NextResponse.json(
        { error: "Invalid expert enquiry payload." },
        { status: 400 },
      );
    }

    const expertName = cleanRequiredText(body.expert_name);
    const question = cleanRequiredText(body.question);
    const urgency = parseUrgency(body.urgency);

    if (!expertName || !question || !urgency) {
      return NextResponse.json(
        { error: "Expert name, question, and urgency are required." },
        { status: 400 },
      );
    }

    const { error: insertError } = await supabase
      .from("expert_enquiries")
      .insert({
        expert_name: expertName,
        question,
        urgency,
        user_id: user.id,
      });

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Expert enquiry error:", error);

    return NextResponse.json(
      { error: "Could not submit expert enquiry." },
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

function parseUrgency(
  value: unknown,
): (typeof urgencyOptions)[number] | null {
  return typeof value === "string" &&
    (urgencyOptions as readonly string[]).includes(value)
    ? (value as (typeof urgencyOptions)[number])
    : null;
}
