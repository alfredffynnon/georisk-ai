import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { NextRequest, NextResponse } from "next/server";

import { COUNTRIES, type CountryCode } from "@/lib/countries";
import { fetchRecentCountryArticles } from "@/lib/country-data";
import { createClient } from "@/lib/supabase/server";
import type { ChatMessage, CompanyProfile } from "@/lib/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

type CountryChatRouteProps = {
  params: {
    countryCode: string;
  };
};

type ChatRequestBody = {
  history?: unknown;
  message?: unknown;
};

type HistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function GET(
  _request: NextRequest,
  { params }: CountryChatRouteProps,
) {
  try {
    const { countryCode, profile, response } = await authenticateCountryRequest(
      params.countryCode,
    );

    if (response) {
      return response;
    }

    const supabase = createClient();
    const { data: messages, error: messagesError } = await supabase
      .from("chat_messages")
      .select("id, user_id, country_code, role, content, created_at")
      .eq("user_id", profile.user_id)
      .eq("country_code", countryCode)
      .order("created_at", { ascending: false })
      .limit(80);

    if (messagesError) {
      throw messagesError;
    }

    return NextResponse.json({
      messages: ((messages ?? []) as ChatMessage[]).reverse(),
    });
  } catch (error) {
    console.error("Country chat history error:", error);

    return NextResponse.json(
      { error: "Could not load chat history." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: CountryChatRouteProps,
) {
  try {
    const { countryCode, profile, response, userId } =
      await authenticateCountryRequest(params.countryCode);

    if (response) {
      return response;
    }

    if (!process.env.NEWSAPI_KEY || !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Country chat is not configured." },
        { status: 500 },
      );
    }

    const body = (await request.json().catch(() => null)) as
      | ChatRequestBody
      | null;
    const message = cleanText(body?.message);

    if (!message) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 },
      );
    }

    const history = parseHistory(body?.history);
    const messages: MessageParam[] = [
      ...history,
      { role: "user" as const, content: message },
    ]
      .slice(-16)
      .map((historyMessage): MessageParam => ({
        content: historyMessage.content,
        role: historyMessage.role,
      }));

    const supabase = createClient();
    const { error: userMessageError } = await supabase
      .from("chat_messages")
      .insert({
        content: message,
        country_code: countryCode,
        role: "user",
        user_id: userId,
      });

    if (userMessageError) {
      throw userMessageError;
    }

    const articles = await fetchRecentCountryArticles(countryCode, 10, 48);
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 50000,
    });
    const modelStream = anthropic.messages.stream({
      max_tokens: 1536,
      messages,
      model: "claude-sonnet-4-6",
      system: buildSystemPrompt(profile, countryCode, articles),
    });

    const encoder = new TextEncoder();
    let assistantResponse = "";
    let isClosed = false;

    const readable = new ReadableStream<Uint8Array>({
      cancel() {
        modelStream.abort();
      },
      start(controller) {
        modelStream.on("text", (textDelta) => {
          if (isClosed) {
            return;
          }

          assistantResponse += textDelta;
          controller.enqueue(encoder.encode(textDelta));
        });

        modelStream.on("error", (streamError) => {
          if (!isClosed) {
            isClosed = true;
            console.error("Anthropic country chat stream error:", streamError);
            controller.error(streamError);
          }
        });

        modelStream.on("abort", () => {
          if (!isClosed) {
            isClosed = true;
            closeController(controller);
          }
        });

        modelStream.on("end", async () => {
          if (isClosed) {
            return;
          }

          try {
            if (assistantResponse.trim()) {
              const { error: assistantMessageError } = await supabase
                .from("chat_messages")
                .insert({
                  content: assistantResponse,
                  country_code: countryCode,
                  role: "assistant",
                  user_id: userId,
                });

              if (assistantMessageError) {
                console.error(
                  "Could not persist assistant country chat message:",
                  assistantMessageError,
                );
              }
            }
          } finally {
            isClosed = true;
            closeController(controller);
          }
        });
      },
    });

    return new Response(readable, {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Country chat error:", error);

    return NextResponse.json(
      { error: "Could not generate analyst response." },
      { status: 500 },
    );
  }
}

async function authenticateCountryRequest(countryCodeParam: string) {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      countryCode: null,
      profile: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      userId: null,
    } as const;
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
    return {
      countryCode: null,
      profile: null,
      response: NextResponse.json(
        { error: "Company profile required." },
        { status: 403 },
      ),
      userId: user.id,
    } as const;
  }

  const countryCode = countryCodeParam.toUpperCase();

  if (!isCountryCode(countryCode)) {
    return {
      countryCode: null,
      profile: profile as CompanyProfile,
      response: NextResponse.json(
        { error: "Country not found." },
        { status: 404 },
      ),
      userId: user.id,
    } as const;
  }

  return {
    countryCode,
    profile: profile as CompanyProfile,
    response: null,
    userId: user.id,
  } as const;
}

function buildSystemPrompt(
  profile: CompanyProfile,
  countryCode: CountryCode,
  articles: Awaited<ReturnType<typeof fetchRecentCountryArticles>>,
) {
  const country = COUNTRIES[countryCode];
  const recentIntelligence =
    articles.length > 0
      ? articles
          .map(
            (article) =>
              `${article.source.name}: ${article.title}. ${article.description}`,
          )
          .join("\n")
      : "No qualifying NewsAPI articles were returned in the last 48 hours.";

  return `You are a senior analyst specialising in ${country.name} geopolitics and economics. You are advising ${profile.company_name}, a ${profile.industry_vertical} firm. Their key assets: ${profile.key_assets ?? "Not specified"}. Their supply chain dependencies: ${profile.supply_chain ?? "Not specified"}. You have access to the following recent intelligence from ${country.name} \u2014 ground every response in these specific sources. If asked about something not covered by the intelligence provided, say so explicitly rather than drawing on general knowledge. Be direct and actionable \u2014 this client makes capital allocation decisions.
Recent intelligence: ${recentIntelligence}`;
}

function parseHistory(value: unknown): HistoryMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<HistoryMessage[]>((messages, item) => {
    if (!isRecord(item)) {
      return messages;
    }

    const role = item.role;
    const content = cleanText(item.content);

    if ((role === "user" || role === "assistant") && content) {
      messages.push({ content, role });
    }

    return messages;
  }, []);
}

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function closeController(controller: ReadableStreamDefaultController<Uint8Array>) {
  try {
    controller.close();
  } catch {
    // The browser may have already canceled the response stream.
  }
}

function isCountryCode(countryCode: string): countryCode is CountryCode {
  return Object.prototype.hasOwnProperty.call(COUNTRIES, countryCode);
}
