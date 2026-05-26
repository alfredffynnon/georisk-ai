"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Copy, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Portfolio = {
  id: string;
  name: string;
  sector: string | null;
  geography: string | null;
  assets: string | null;
  dependencies: string | null;
  created_at: string;
};

type ConfidenceLevel = "High" | "Medium" | "Low";

type Brief = {
  relevant_scenarios: string[];
  transmission_channels: string[];
  evidence: string[];
  confidence_levels: Record<string, ConfidenceLevel>;
  diligence_questions: string[];
  monitoring_triggers: string[];
  recommended_actions: string[];
};

type BriefPageProps = {
  params: {
    portfolioId: string;
  };
};

type BriefSection = {
  title: string;
  items: string[];
};

export default function BriefPage({ params }: BriefPageProps) {
  const { portfolioId } = params;
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    async function loadBrief() {
      setIsLoading(true);
      setError(null);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/auth/login");
          return;
        }

        const { data: portfolioData, error: portfolioError } = await supabase
          .from("portfolios")
          .select("id, name, sector, geography, assets, dependencies, created_at")
          .eq("id", portfolioId)
          .single();

        if (portfolioError || !portfolioData) {
          throw new Error("Could not load this portfolio.");
        }

        const response = await fetch("/api/brief/generate", {
          body: JSON.stringify({
            portfolio: portfolioData,
            portfolioId,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Brief generation failed.");
        }

        const generated = (await response.json()) as { brief?: Brief };

        if (!generated.brief) {
          throw new Error("Brief generation returned an empty response.");
        }

        if (isActive) {
          setPortfolio(portfolioData as Portfolio);
          setBrief(generated.brief);
        }
      } catch (loadError) {
        if (isActive && !controller.signal.aborted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Brief generation failed.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadBrief();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [portfolioId, router, supabase]);

  async function copyMemo() {
    if (!portfolio || !brief) {
      return;
    }

    try {
      setCopyError(null);
      await navigator.clipboard.writeText(formatMemo(portfolio, brief));
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1800);
    } catch {
      setCopyError("Could not copy memo.");
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-6 py-10">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <Loader2
              className="size-10 animate-spin text-accent"
              aria-hidden="true"
            />
            <p className="text-lg font-medium text-foreground">
              Analysing geopolitical exposure&hellip;
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (error || !portfolio || !brief) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-6 py-10">
        <Card className="w-full max-w-lg border-destructive/40 bg-destructive/10">
          <CardHeader>
            <div className="mb-2 flex items-center gap-2 text-destructive-foreground">
              <AlertTriangle aria-hidden="true" />
              <CardTitle>Brief generation failed</CardTitle>
            </div>
            <CardDescription className="text-destructive-foreground/80">
              {error || "Could not generate an exposure brief."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard">
                <ArrowLeft data-icon="inline-start" aria-hidden="true" />
                Back to Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const sections: BriefSection[] = [
    {
      title: "Relevant Scenarios",
      items: brief.relevant_scenarios,
    },
    {
      title: "Transmission Channels",
      items: brief.transmission_channels,
    },
    {
      title: "Supporting Evidence",
      items: brief.evidence,
    },
    {
      title: "Key Diligence Questions",
      items: brief.diligence_questions,
    },
    {
      title: "Monitoring Triggers",
      items: brief.monitoring_triggers,
    },
    {
      title: "Recommended Actions",
      items: brief.recommended_actions,
    },
  ];

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-6 py-10">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3">
            <Button asChild variant="ghost" className="w-fit">
              <Link href="/dashboard">
                <ArrowLeft data-icon="inline-start" aria-hidden="true" />
                Dashboard
              </Link>
            </Button>
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-semibold tracking-normal text-foreground">
                {portfolio.name}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                {portfolio.sector || "Sector not specified"} |{" "}
                {portfolio.geography || "Geography not specified"}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={copyMemo} className="w-full sm:w-auto">
              <Copy data-icon="inline-start" aria-hidden="true" />
              {isCopied ? "Copied" : "Copy as Memo"}
            </Button>
            {copyError ? (
              <p className="text-sm text-destructive-foreground">
                {copyError}
              </p>
            ) : null}
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Confidence Levels</CardTitle>
              <CardDescription>
                Current confidence by exposure theme.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {Object.entries(brief.confidence_levels).map(([theme, level]) => (
                <div
                  key={theme}
                  className="flex items-center justify-between gap-4 rounded-md border border-white/10 bg-background/60 px-4 py-3"
                >
                  <span className="text-sm font-medium text-foreground">
                    {theme}
                  </span>
                  <Badge
                    variant="outline"
                    className={confidenceBadgeClassName(level)}
                  >
                    {level}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {sections.map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex list-disc flex-col gap-3 pl-5 text-sm leading-6 text-foreground">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}

function confidenceBadgeClassName(level: ConfidenceLevel) {
  return cn(
    "min-w-16 justify-center",
    level === "High" &&
      "border-destructive/40 bg-destructive/10 text-destructive-foreground",
    level === "Medium" && "border-accent/40 bg-accent/10 text-accent",
    level === "Low" && "border-white/10 bg-secondary text-muted-foreground",
  );
}

function formatMemo(portfolio: Portfolio, brief: Brief) {
  const sections: Array<[string, string[]]> = [
    ["Relevant Scenarios", brief.relevant_scenarios],
    ["Transmission Channels", brief.transmission_channels],
    ["Supporting Evidence", brief.evidence],
    [
      "Confidence Levels",
      Object.entries(brief.confidence_levels).map(
        ([theme, level]) => `${theme}: ${level}`,
      ),
    ],
    ["Key Diligence Questions", brief.diligence_questions],
    ["Monitoring Triggers", brief.monitoring_triggers],
    ["Recommended Actions", brief.recommended_actions],
  ];

  return [
    "GeoRisk AI Exposure Brief",
    `Portfolio: ${portfolio.name}`,
    `Sector: ${portfolio.sector || "Not specified"}`,
    `Geography: ${portfolio.geography || "Not specified"}`,
    "",
    ...sections.flatMap(([title, items]) => [
      title,
      ...items.map((item) => `- ${item}`),
      "",
    ]),
  ].join("\n");
}
