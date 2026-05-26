import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: { email?: unknown };

  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Invalid waitlist request." },
      { status: 400 },
    );
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!emailPattern.test(email)) {
    return NextResponse.json(
      { error: "A valid email address is required." },
      { status: 400 },
    );
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.from("waitlist_emails").insert({ email });

    if (error && error.code !== "23505") {
      return NextResponse.json(
        { error: "Could not join the waitlist." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Could not join the waitlist." },
      { status: 500 },
    );
  }
}
