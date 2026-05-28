"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { ArrowDown, ArrowRight, Copy, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ConfidenceLevel = "High" | "Medium" | "Low";

type ConfidenceEntry = {
  label: string;
  level: ConfidenceLevel;
  rationale: string;
};

type BriefSection = {
  title: string;
  items: string[];
};

const demoPortfolio = {
  name: "LNG Terminal Operator",
  sector: "Energy infrastructure",
  geography: "Strait of Hormuz | European gas markets",
};

const confidenceLevels: ConfidenceEntry[] = [
  {
    label: "Strait of Hormuz disruption",
    level: "Medium",
    rationale: "elevated probability but full closure historically rare",
  },
  {
    label: "European gas price volatility",
    level: "High",
    rationale: "structural supply deficit confirmed through 2027",
  },
  {
    label: "Regasification bottleneck",
    level: "High",
    rationale: "capacity data confirmed by ENTSO-G",
  },
];

const briefSections: BriefSection[] = [
  {
    title: "Relevant Scenarios",
    items: [
      "Strait of Hormuz partial closure risk — Iran-US tensions escalating (Urgency: High)",
      "European gas supply disruption — Russian pipeline flows at 23% of 2021 levels (Urgency: High)",
      "EU LNG import infrastructure bottlenecks — regasification capacity constraints (Urgency: Medium)",
    ],
  },
  {
    title: "Transmission Channels",
    items: [
      "Strait closure → spot LNG cargo rerouting via Cape of Good Hope → 18–22 day voyage extension → shipping cost spike → terminal throughput delay",
      "Russian supply deficit → European spot gas price volatility → LNG price premium compression → offtake agreement renegotiation pressure",
      "Regasification bottleneck → cargo queuing → demurrage cost exposure → revenue timing mismatch",
    ],
  },
  {
    title: "Supporting Evidence",
    items: [
      "European TTF gas spot price averaged €42/MWh in Q1 2026, down from €180/MWh peak but 3x pre-2021 baseline",
      "Iranian naval exercises in Hormuz Strait increased 40% in frequency since January 2026",
      "Germany's three new FSRU terminals operating at 94% capacity with 6-vessel queue as of April 2026",
    ],
  },
  {
    title: "Key Diligence Questions",
    items: [
      "What percentage of offtake contracts are indexed to TTF spot vs fixed-price?",
      "Does the terminal have priority berthing rights or is it subject to queue-based scheduling?",
      "What is the maximum demurrage liability per vessel per day under current charter agreements?",
      "Are force majeure clauses in offtake agreements triggered by Hormuz closure or only by terminal-side events?",
    ],
  },
  {
    title: "Monitoring Triggers",
    items: [
      "Iranian naval activity in Hormuz exceeds 3 incidents per week",
      "TTF spot price breaks above €60/MWh for 5 consecutive trading days",
      "New German FSRU terminal commissioned — reduces queue pressure",
    ],
  },
  {
    title: "Recommended Actions",
    items: [
      "Review force majeure provisions in all offtake agreements against Hormuz closure scenario",
      "Model terminal revenue impact under TTF at €30, €50, €80/MWh",
      "Engage shipping broker for indicative Cape rerouting cost — update project finance model",
      "Monitor ENTSO-G weekly gas storage bulletins as leading indicator",
    ],
  },
];

const useCases = [
  {
    title: "LNG Terminal Operator",
    risks: "Strait of Hormuz, European gas disruption",
    description:
      "Shipping route closure transmits into throughput delay and offtake renegotiation pressure within 72 hours.",
  },
  {
    title: "Battery Storage Developer",
    risks: "China critical minerals export controls, EU clean-tech de-risking",
    description:
      "Lithium and cobalt export restrictions transmit into capex overrun and project timeline slippage.",
  },
  {
    title: "Commodity Trading Firm",
    risks: "Russia sanctions tightening, shadow fleet enforcement",
    description:
      "Secondary sanctions exposure on counterparties transmits into financing cost spike and compliance liability.",
  },
];

const featureCallouts = [
  {
    description:
      "Continuously scans geopolitical developments across monitored markets.",
    title: "Live Signal Detection",
  },
  {
    description:
      "Maps events to the assets, counterparties, and supply chains you care about.",
    title: "Company-Specific Translation",
  },
  {
    description:
      "Escalate complex questions to former policymakers and regional specialists.",
    title: "Expert Network Access",
  },
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Home() {
  const [email, setEmail] = useState("");
  const [waitlistState, setWaitlistState] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [waitlistError, setWaitlistError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function copyMemo() {
    try {
      setCopyError(null);
      await navigator.clipboard.writeText(formatMemo());
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1800);
    } catch {
      setCopyError("Could not copy memo.");
    }
  }

  async function submitWaitlist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!emailPattern.test(normalizedEmail)) {
      setWaitlistState("error");
      setWaitlistError("Enter a valid email address.");
      return;
    }

    setWaitlistState("submitting");
    setWaitlistError(null);

    try {
      const response = await fetch("/api/waitlist", {
        body: JSON.stringify({ email: normalizedEmail }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Waitlist request failed.");
      }

      setEmail(normalizedEmail);
      setWaitlistState("success");
    } catch {
      setWaitlistState("error");
      setWaitlistError("Something went wrong. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-[calc(88vh-4rem)] w-full max-w-6xl flex-col justify-center gap-10 px-6 py-16 sm:py-20">
        <div className="flex max-w-5xl flex-col gap-7">
          <h1 className="max-w-5xl text-4xl font-semibold leading-tight tracking-normal text-foreground sm:text-6xl lg:text-7xl">
            Know what&apos;s happening in your markets before it makes the
            news
          </h1>
          <p className="max-w-3xl text-base leading-7 text-muted-foreground sm:text-xl sm:leading-9">
            Real-time geopolitical intelligence, translated into the specific
            risk exposure of your portfolio
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            className="h-11 bg-primary px-6 text-sm hover:bg-primary/90"
            onClick={() => scrollToSection("waitlist")}
          >
            Join the waitlist
          </Button>
          <Button
            className="h-11 border-white/15 bg-transparent px-6 text-sm text-foreground hover:bg-white/10 hover:text-foreground"
            onClick={() => scrollToSection("demo")}
            variant="outline"
          >
            See a live brief
            <ArrowDown aria-hidden="true" />
          </Button>
        </div>

        <div className="border-y border-white/10 py-4 text-sm font-medium text-muted-foreground">
          Built at Harvard · Institute of Politics · Backed by EasyA
        </div>
      </section>

      <section className="px-6 pb-14">
        <div className="mx-auto grid w-full max-w-6xl gap-4 md:grid-cols-3">
          {featureCallouts.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="demo" className="scroll-mt-20 px-6 py-20">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h2 className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
              Live Example Brief — No sign-up required
            </h2>
          </div>

          <DemoBrief
            copyError={copyError}
            isCopied={isCopied}
            onCopy={copyMemo}
          />
        </div>
      </section>

      <section className="px-6 py-14">
        <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-3">
          {useCases.map((useCase) => (
            <Card key={useCase.title}>
              <CardHeader>
                <CardTitle>{useCase.title}</CardTitle>
                <CardDescription>Key risks: {useCase.risks}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-foreground">
                  {useCase.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <h2 className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
            How it works
          </h2>
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-start">
            <Step number={1} text="Enter your portfolio context" />
            <ArrowRight
              className="mt-8 hidden size-5 text-muted-foreground lg:block"
              aria-hidden="true"
            />
            <Step number={2} text="Agent maps your geopolitical exposure" />
            <ArrowRight
              className="mt-8 hidden size-5 text-muted-foreground lg:block"
              aria-hidden="true"
            />
            <Step
              number={3}
              text="Receive a brief ready for your IC memo"
            />
          </div>
        </div>
      </section>

      <section id="waitlist" className="scroll-mt-20 px-6 py-20">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 border-t border-white/10 pt-12">
          <div className="flex flex-col gap-3">
            <h2 className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
              Get early access
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
              Built for infrastructure funds, energy-transition investors, and
              private credit managers. Join the waitlist for priority access.
            </p>
          </div>

          <form
            className="flex flex-col gap-3 sm:flex-row"
            noValidate
            onSubmit={submitWaitlist}
          >
            <label className="sr-only" htmlFor="waitlist-email">
              Email address
            </label>
            <input
              id="waitlist-email"
              autoComplete="email"
              className="h-11 flex-1 rounded-md border border-white/10 bg-card px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-1 focus:ring-accent"
              inputMode="email"
              onChange={(event) => {
                setEmail(event.target.value);
                if (waitlistState === "error" || waitlistState === "success") {
                  setWaitlistState("idle");
                  setWaitlistError(null);
                }
              }}
              placeholder="you@firm.com"
              type="email"
              value={email}
            />
            <Button
              className="h-11 bg-primary px-6 text-sm hover:bg-primary/90"
              disabled={waitlistState === "submitting"}
              type="submit"
            >
              {waitlistState === "submitting" ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : null}
              Join waitlist
              {waitlistState === "submitting" ? null : (
                <ArrowRight aria-hidden="true" />
              )}
            </Button>
          </form>

          {waitlistState === "success" ? (
            <p className="text-sm font-medium text-accent">
              You&apos;re on the list. We&apos;ll be in touch.
            </p>
          ) : null}
          {waitlistState === "error" && waitlistError ? (
            <p className="text-sm font-medium text-destructive-foreground">
              {waitlistError}
            </p>
          ) : null}
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8">
        <div className="mx-auto w-full max-w-6xl text-sm text-muted-foreground">
          GeoRisk AI · Built at Harvard · Backed by EasyA · 2026
        </div>
      </footer>
    </main>
  );
}

function Step({ number, text }: { number: number; text: string }) {
  return (
    <div className="border-t border-white/10 pt-5 text-foreground">
      <p className="mb-3 text-sm font-semibold text-accent">{number}.</p>
      <h3 className="text-xl font-semibold tracking-normal">{text}</h3>
    </div>
  );
}

function DemoBrief({
  copyError,
  isCopied,
  onCopy,
}: {
  copyError: string | null;
  isCopied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex w-full flex-col gap-8">
      <header className="flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2">
          <h3 className="text-3xl font-semibold tracking-normal text-foreground">
            {demoPortfolio.name}
          </h3>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {demoPortfolio.sector} | {demoPortfolio.geography}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={onCopy} className="w-full sm:w-auto">
            <Copy data-icon="inline-start" aria-hidden="true" />
            {isCopied ? "Copied" : "Copy as Memo"}
          </Button>
          {copyError ? (
            <p className="text-sm text-destructive-foreground">{copyError}</p>
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
            {confidenceLevels.map((entry) => (
              <div
                key={entry.label}
                className="flex items-start justify-between gap-4 rounded-md border border-white/10 bg-background/60 px-4 py-3 sm:items-center"
              >
                <span className="flex flex-col gap-1 text-sm leading-6 text-foreground">
                  <span className="font-medium">{entry.label}</span>
                  <span className="text-muted-foreground">
                    {entry.rationale}
                  </span>
                </span>
                <Badge
                  variant="outline"
                  className={confidenceBadgeClassName(entry.level)}
                >
                  {entry.level}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {briefSections.map((section) => (
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
    </div>
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

function formatMemo() {
  const sections: Array<[string, string[]]> = [
    ["Relevant Scenarios", briefSections[0].items],
    ["Transmission Channels", briefSections[1].items],
    ["Supporting Evidence", briefSections[2].items],
    [
      "Confidence Levels",
      confidenceLevels.map(
        (entry) => `${entry.label}: ${entry.level} — ${entry.rationale}`,
      ),
    ],
    ["Key Diligence Questions", briefSections[3].items],
    ["Monitoring Triggers", briefSections[4].items],
    ["Recommended Actions", briefSections[5].items],
  ];

  return [
    "GeoRisk AI Exposure Brief",
    `Portfolio: ${demoPortfolio.name}`,
    `Sector: ${demoPortfolio.sector}`,
    `Geography: ${demoPortfolio.geography}`,
    "",
    ...sections.flatMap(([title, items]) => [
      title,
      ...items.map((item) => `- ${item}`),
      "",
    ]),
  ].join("\n");
}
