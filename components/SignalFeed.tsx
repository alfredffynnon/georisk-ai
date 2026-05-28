"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type SignalCategory = "economic" | "political" | "jurisdiction" | "security";

type Signal = {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  countryCode: string;
  countryName: string;
  countryFlag: string;
  score: number;
  reason: string;
  category: SignalCategory;
};

const relevanceStyles = {
  5: "bg-red-500/20 text-red-200 ring-red-400/40",
  4: "bg-orange-500/20 text-orange-200 ring-orange-400/40",
  3: "bg-yellow-500/20 text-yellow-100 ring-yellow-400/40",
} as const;

export function SignalFeed() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    async function loadSignals() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/signals", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Could not load live signals.");
        }

        const payload = (await response.json()) as Signal[];

        if (isActive) {
          setSignals(payload);
        }
      } catch (loadError) {
        if (!controller.signal.aborted && isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load live signals.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadSignals();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="grid gap-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            className="min-h-32 animate-pulse rounded-lg border border-white/10 bg-[#111827]/80 p-5"
            key={index}
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
              <div className="flex w-full flex-col gap-3 lg:w-44">
                <div className="h-7 w-24 rounded-md bg-white/10" />
                <div className="h-4 w-32 rounded bg-white/10" />
                <div className="h-5 w-24 rounded bg-white/10" />
              </div>
              <div className="flex flex-1 flex-col gap-4">
                <div className="h-5 w-full rounded bg-white/10" />
                <div className="h-5 w-4/5 rounded bg-white/10" />
                <div className="mt-auto h-4 w-40 self-end rounded bg-white/10" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-400/20 bg-red-500/10 px-5 py-6 text-sm text-red-100">
        {error}
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-[#111827]/[0.65] px-5 py-10 text-center text-sm text-slate-400">
        No high-relevance signals detected in the last 24 hours
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {signals.map((signal, index) => (
        <a
          className="animate-in fade-in block rounded-lg border border-white/10 bg-[#111827]/[0.82] p-5 shadow-sm shadow-black/20 transition duration-200 hover:border-cyan-300/40 hover:bg-[#142033]"
          href={signal.url}
          key={`${signal.url}-${signal.countryCode}`}
          rel="noreferrer"
          style={{ animationDelay: `${index * 70}ms` }}
          target="_blank"
        >
          <article className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
            <div className="flex w-full shrink-0 flex-col gap-3 lg:w-44">
              <span
                className={cn(
                  "w-fit rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-normal ring-1",
                  getRelevanceClass(signal.score),
                )}
              >
                {getRelevanceLabel(signal.score)}
              </span>

              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <span className="text-lg leading-none" aria-hidden="true">
                  {signal.countryFlag}
                </span>
                <span>{signal.countryName}</span>
              </div>

              <span className="w-fit rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-medium uppercase tracking-normal text-slate-400">
                {signal.category}
              </span>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div>
                <h3 className="text-base font-semibold leading-6 text-white">
                  {signal.title}
                </h3>
                <p className="mt-2 text-sm leading-5 text-slate-400">
                  {signal.reason}
                </p>
              </div>

              <div className="mt-auto flex items-center justify-end text-xs text-slate-500">
                <span>
                  {signal.source} - {formatTimeAgo(signal.publishedAt)}
                </span>
              </div>
            </div>
          </article>
        </a>
      ))}
    </div>
  );
}

function getRelevanceLabel(score: number) {
  if (score >= 5) {
    return "CRITICAL";
  }

  if (score >= 4) {
    return "HIGH";
  }

  return "MODERATE";
}

function getRelevanceClass(score: number) {
  if (score >= 5) {
    return relevanceStyles[5];
  }

  if (score >= 4) {
    return relevanceStyles[4];
  }

  return relevanceStyles[3];
}

function formatTimeAgo(value: string) {
  const publishedAt = new Date(value).getTime();

  if (!Number.isFinite(publishedAt)) {
    return "recently";
  }

  const diffInSeconds = Math.round((publishedAt - Date.now()) / 1000);
  const units = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ] as const;

  for (const [unit, secondsInUnit] of units) {
    const valueInUnit = Math.trunc(diffInSeconds / secondsInUnit);

    if (Math.abs(valueInUnit) >= 1) {
      return new Intl.RelativeTimeFormat("en", {
        numeric: "auto",
      }).format(valueInUnit, unit);
    }
  }

  return "just now";
}
