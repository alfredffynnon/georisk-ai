"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type {
  BriefContent,
  CountryBriefAction,
  CountryBriefScenario,
  RiskLabel,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type CountryBriefWorkspaceProps = {
  companyName: string;
  country: {
    flag: string;
    name: string;
    region: string;
  };
  countryCode: string;
  initialBrief: {
    brief: BriefContent;
    generatedAt: string | null;
  } | null;
};

const riskBannerStyles: Record<RiskLabel, string> = {
  Critical: "border-red-300/35 bg-red-500/15 text-red-50",
  Elevated: "border-yellow-300/35 bg-yellow-400/12 text-yellow-50",
  Guarded: "border-cyan-300/30 bg-cyan-400/12 text-cyan-50",
  High: "border-orange-300/35 bg-orange-500/15 text-orange-50",
  Stable: "border-emerald-300/30 bg-emerald-400/12 text-emerald-50",
};

const actionTimeframes = [
  { value: "immediate", label: "Immediate" },
  { value: "30-days", label: "30 Days" },
  { value: "90-days", label: "90 Days" },
] as const;

export function CountryBriefWorkspace({
  companyName,
  country,
  countryCode,
  initialBrief,
}: CountryBriefWorkspaceProps) {
  const [brief, setBrief] = useState<BriefContent | null>(
    initialBrief?.brief ?? null,
  );
  const [generatedAt, setGeneratedAt] = useState<string | null>(
    initialBrief?.generatedAt ?? null,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const generatedLabel = useMemo(
    () => (generatedAt ? formatTimestamp(generatedAt) : "Not generated"),
    [generatedAt],
  );

  async function generateBrief() {
    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch(`/api/countries/${countryCode}/brief`, {
        cache: "no-store",
        method: "POST",
      });

      const payload = (await response.json().catch(() => null)) as {
        brief?: BriefContent;
        error?: string;
        generatedAt?: string;
      } | null;

      if (!response.ok || !payload?.brief) {
        throw new Error(payload?.error ?? "Brief generation failed.");
      }

      setBrief(payload.brief);
      setGeneratedAt(payload.generatedAt ?? new Date().toISOString());
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Brief generation failed.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyMemo() {
    if (!brief) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        formatMemo(country.name, companyName, generatedLabel, brief),
      );
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1800);
    } catch {
      setError("Could not copy memo.");
    }
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#0a0e1a] px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-col gap-4">
            <Button
              asChild
              className="w-fit border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] hover:text-white"
              variant="outline"
            >
              <Link href={`/dashboard/${countryCode.toLowerCase()}`}>
                <ArrowLeft aria-hidden="true" />
                {country.name}
              </Link>
            </Button>

            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold tracking-normal text-white md:text-4xl">
                <span aria-hidden="true">{country.flag}</span> {country.name} Intelligence Brief
              </h1>
              <p className="text-sm leading-6 text-slate-400">
                Prepared for {companyName} exposure in {country.region}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <p
              className="text-sm font-medium text-slate-300"
              suppressHydrationWarning
            >
              Generated: {generatedLabel}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="border-cyan-300/30 bg-cyan-300 text-[#0a0e1a] hover:bg-cyan-200"
                disabled={isGenerating}
                onClick={generateBrief}
                type="button"
              >
                {isGenerating ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw aria-hidden="true" />
                )}
                Generate Brief
              </Button>
              <Button
                className="border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08] hover:text-white"
                disabled={!brief}
                onClick={copyMemo}
                type="button"
                variant="outline"
              >
                {isCopied ? (
                  <Check aria-hidden="true" />
                ) : (
                  <Copy aria-hidden="true" />
                )}
                {isCopied ? "Copied" : "Copy as Memo"}
              </Button>
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-md border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        {brief ? (
          <BriefDisplay brief={brief} />
        ) : (
          <EmptyBriefState
            countryName={country.name}
            isGenerating={isGenerating}
            onGenerate={generateBrief}
          />
        )}
      </section>
    </main>
  );
}

function BriefDisplay({ brief }: { brief: BriefContent }) {
  return (
    <div className="flex flex-col gap-8 pb-10">
      <RiskRatingBanner brief={brief} />

      <section className="flex flex-col gap-4">
        <SectionTitle>Scenarios</SectionTitle>
        <div className="grid gap-4 lg:grid-cols-3">
          {brief.scenarios.map((scenario) => (
            <ScenarioCard key={scenario.name} scenario={scenario} />
          ))}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <TransmissionChannels channels={brief.transmission_channels} />
        <EconomicExposure brief={brief} />
      </section>

      <section className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <DiligenceQuestions questions={brief.diligence_questions} />
        <MonitoringTriggers brief={brief} />
      </section>

      <RecommendedActions actions={brief.recommended_actions} />

      <section className="border-t border-white/10 pt-5">
        <p className="text-xs leading-5 text-slate-500">
          Intelligence drawn from: {brief.sources_used.join(", ")}
        </p>
      </section>
    </div>
  );
}

function RiskRatingBanner({ brief }: { brief: BriefContent }) {
  const label = getRiskLabel(brief.risk_rating.label);

  return (
    <section
      className={cn(
        "rounded-lg border p-6 shadow-sm shadow-black/20",
        riskBannerStyles[label],
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-current/70">
            Risk Rating
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-normal text-white">
            Risk Level {brief.risk_rating.score}/5 {"\u2014"} {label}
          </h2>
        </div>
        <ShieldAlert className="size-10 shrink-0 text-current/80" aria-hidden="true" />
      </div>
      <p className="mt-4 max-w-5xl text-sm leading-6 text-current/85 md:text-base">
        {brief.risk_rating.summary}
      </p>
    </section>
  );
}

function ScenarioCard({ scenario }: { scenario: CountryBriefScenario }) {
  return (
    <article className="flex min-h-96 flex-col rounded-lg border border-white/10 bg-[#111827]/85 p-5 shadow-sm shadow-black/20">
      <h3 className="text-lg font-semibold leading-6 tracking-normal text-white">
        {scenario.name}
      </h3>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        {scenario.description}
      </p>

      <ProbabilityBar
        adverseProbability={scenario.adverse_probability}
        baseProbability={scenario.base_case_probability}
      />

      <div className="mt-auto rounded-md border border-cyan-300/15 bg-cyan-300/10 p-4">
        <p className="text-xs font-bold uppercase text-cyan-100">
          Client Impact:
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-100">
          {scenario.client_impact}
        </p>
      </div>
    </article>
  );
}

function ProbabilityBar({
  adverseProbability,
  baseProbability,
}: {
  adverseProbability: number;
  baseProbability: number;
}) {
  const basePercent = normaliseProbability(baseProbability);
  const adversePercent = normaliseProbability(adverseProbability);
  const totalPercent = basePercent + adversePercent;
  const scale = totalPercent > 100 ? 100 / totalPercent : 1;

  return (
    <div className="my-5 flex flex-col gap-2">
      <div
        className="flex h-3 overflow-hidden rounded-full bg-white/10"
        aria-label={`Base case ${formatProbability(basePercent)}, adverse ${formatProbability(adversePercent)}`}
      >
        <div
          className="bg-cyan-300"
          style={{ width: `${basePercent * scale}%` }}
        />
        <div
          className="bg-red-400"
          style={{ width: `${adversePercent * scale}%` }}
        />
      </div>
      <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-400">
        <span>
          Base case:{" "}
          <strong className="font-semibold text-cyan-100">
            {formatProbability(basePercent)}
          </strong>
        </span>
        <span>
          Adverse:{" "}
          <strong className="font-semibold text-red-200">
            {formatProbability(adversePercent)}
          </strong>
        </span>
      </div>
    </div>
  );
}

function TransmissionChannels({ channels }: { channels: string[] }) {
  return (
    <section className="flex flex-col gap-4">
      <SectionTitle>Transmission Channels</SectionTitle>
      <ol className="flex flex-col gap-3">
        {channels.map((channel, index) => (
          <li
            className="grid grid-cols-[2rem_1fr] gap-3 rounded-md border border-white/10 bg-[#111827]/70 p-4 text-sm leading-6 text-slate-200"
            key={channel}
          >
            <span className="flex size-8 items-center justify-center rounded-md bg-cyan-300/10 text-sm font-bold text-cyan-100">
              {index + 1}
            </span>
            <span>{channel}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function EconomicExposure({ brief }: { brief: BriefContent }) {
  return (
    <section className="flex flex-col gap-4">
      <SectionTitle>Economic Exposure</SectionTitle>
      <div className="rounded-lg border border-white/10 bg-[#111827]/80 p-5 shadow-sm shadow-black/20">
        <p className="text-sm leading-6 text-slate-300">
          {brief.economic_exposure.narrative}
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase text-slate-500">
                <th className="border-b border-white/10 pb-3 pr-4 font-semibold">
                  Metric
                </th>
                <th className="border-b border-white/10 px-4 pb-3 font-semibold">
                  Value
                </th>
                <th className="border-b border-white/10 pb-3 pl-4 font-semibold">
                  Implication
                </th>
              </tr>
            </thead>
            <tbody>
              {brief.economic_exposure.key_metrics.map((metric) => (
                <tr key={metric.label}>
                  <td className="border-b border-white/5 py-4 pr-4 font-medium text-white">
                    {metric.label}
                  </td>
                  <td className="border-b border-white/5 px-4 py-4 text-cyan-100">
                    {metric.value}
                  </td>
                  <td className="border-b border-white/5 py-4 pl-4 leading-6 text-slate-300">
                    {metric.implication}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function DiligenceQuestions({ questions }: { questions: string[] }) {
  return (
    <section className="flex flex-col gap-4">
      <SectionTitle>Diligence Questions</SectionTitle>
      <ol className="rounded-lg border border-yellow-300/20 bg-yellow-300/10 p-5">
        {questions.map((question, index) => (
          <li
            className="grid grid-cols-[2rem_1fr] gap-3 py-3 text-sm leading-6 text-yellow-50 first:pt-0 last:pb-0"
            key={question}
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-yellow-200/15 text-xs font-bold text-yellow-100">
              {index + 1}
            </span>
            <span>{question}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function MonitoringTriggers({ brief }: { brief: BriefContent }) {
  return (
    <section className="flex flex-col gap-4">
      <SectionTitle>Monitoring Triggers</SectionTitle>
      <div className="overflow-x-auto rounded-lg border border-white/10 bg-[#111827]/80 shadow-sm shadow-black/20">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="bg-white/[0.03] text-xs uppercase text-slate-500">
              <th className="border-b border-white/10 px-4 py-3 font-semibold">
                Signal
              </th>
              <th className="border-b border-white/10 px-4 py-3 font-semibold">
                Threshold
              </th>
              <th className="border-b border-white/10 px-4 py-3 font-semibold">
                Recommended Action
              </th>
            </tr>
          </thead>
          <tbody>
            {brief.monitoring_triggers.map((trigger) => (
              <tr key={`${trigger.signal}-${trigger.threshold}`}>
                <td className="border-b border-white/5 px-4 py-4 font-medium text-white">
                  {trigger.signal}
                </td>
                <td className="border-b border-white/5 px-4 py-4 text-slate-300">
                  {trigger.threshold}
                </td>
                <td className="border-b border-white/5 px-4 py-4 leading-6 text-slate-300">
                  {trigger.action}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RecommendedActions({ actions }: { actions: CountryBriefAction[] }) {
  return (
    <section className="flex flex-col gap-4">
      <SectionTitle>Recommended Actions</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-3">
        {actionTimeframes.map((timeframe) => {
          const timeframeActions = actions.filter(
            (action) => action.timeframe === timeframe.value,
          );

          return (
            <div className="flex flex-col gap-3" key={timeframe.value}>
              <h3 className="text-sm font-semibold uppercase text-slate-400">
                {timeframe.label}
              </h3>
              {timeframeActions.length > 0 ? (
                timeframeActions.map((action) => (
                  <article
                    className={cn(
                      "rounded-lg border border-white/10 bg-[#111827]/80 p-4 text-sm leading-6 text-slate-200 shadow-sm shadow-black/20",
                      action.priority === "high" && "border-l-4 border-l-red-400",
                    )}
                    key={action.action}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-xs font-bold uppercase text-slate-500">
                        {action.priority} priority
                      </span>
                    </div>
                    {action.action}
                  </article>
                ))
              ) : (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-500">
                  No actions assigned.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EmptyBriefState({
  countryName,
  isGenerating,
  onGenerate,
}: {
  countryName: string;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  return (
    <section className="flex min-h-[26rem] items-center justify-center rounded-lg border border-white/10 bg-[#111827]/60 p-8 text-center">
      <div className="flex max-w-xl flex-col items-center gap-4">
        <ShieldAlert className="size-10 text-cyan-200" aria-hidden="true" />
        <h2 className="text-2xl font-semibold tracking-normal text-white">
          No {countryName} brief generated yet
        </h2>
        <p className="text-sm leading-6 text-slate-400">
          Generate the current country intelligence brief for your company profile.
        </p>
        <Button
          className="mt-2 border-cyan-300/30 bg-cyan-300 text-[#0a0e1a] hover:bg-cyan-200"
          disabled={isGenerating}
          onClick={onGenerate}
          type="button"
        >
          {isGenerating ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw aria-hidden="true" />
          )}
          Generate Brief
        </Button>
      </div>
    </section>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xl font-semibold tracking-normal text-white md:text-2xl">
      {children}
    </h2>
  );
}

function getRiskLabel(label: RiskLabel): RiskLabel {
  return riskBannerStyles[label] ? label : "Guarded";
}

function normaliseProbability(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const asPercent = value > 0 && value <= 1 ? value * 100 : value;

  return Math.min(100, Math.max(0, asPercent));
}

function formatProbability(value: number) {
  return `${Math.round(value)}%`;
}

function formatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMemo(
  countryName: string,
  companyName: string,
  generatedAt: string,
  brief: BriefContent,
) {
  return [
    `${countryName} Intelligence Brief`,
    `Client: ${companyName}`,
    `Generated: ${generatedAt}`,
    "",
    `Risk Level ${brief.risk_rating.score}/5 - ${brief.risk_rating.label}`,
    brief.risk_rating.summary,
    "",
    "Scenarios",
    ...brief.scenarios.flatMap((scenario) => [
      `- ${scenario.name}: ${scenario.description}`,
      `  Base case: ${formatProbability(normaliseProbability(scenario.base_case_probability))}; adverse: ${formatProbability(normaliseProbability(scenario.adverse_probability))}`,
      `  Client impact: ${scenario.client_impact}`,
    ]),
    "",
    "Transmission Channels",
    ...brief.transmission_channels.map((channel) => `- ${channel}`),
    "",
    "Economic Exposure",
    brief.economic_exposure.narrative,
    ...brief.economic_exposure.key_metrics.map(
      (metric) =>
        `- ${metric.label}: ${metric.value}. ${metric.implication}`,
    ),
    "",
    "Diligence Questions",
    ...brief.diligence_questions.map((question) => `- ${question}`),
    "",
    "Monitoring Triggers",
    ...brief.monitoring_triggers.map(
      (trigger) =>
        `- ${trigger.signal}: ${trigger.threshold}. Action: ${trigger.action}`,
    ),
    "",
    "Recommended Actions",
    ...brief.recommended_actions.map(
      (action) =>
        `- ${action.timeframe} (${action.priority}): ${action.action}`,
    ),
    "",
    `Sources: ${brief.sources_used.join(", ")}`,
  ].join("\n");
}
