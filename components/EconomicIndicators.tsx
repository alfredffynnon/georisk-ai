"use client";

import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

type Trend = "up" | "down" | "flat";

type IndicatorMetric = {
  value: number | null;
  year: string | null;
  trend?: Trend;
  source?: string;
};

type InterestRateMetric = {
  value: number | null;
  source: string;
} | null;

type IndicatorPayload = {
  gdpGrowth: IndicatorMetric;
  inflation: IndicatorMetric;
  debtToGdp: IndicatorMetric;
  interestRate: InterestRateMetric;
};

type EconomicIndicatorsProps = {
  countryCode: string;
};

export function EconomicIndicators({ countryCode }: EconomicIndicatorsProps) {
  const [indicators, setIndicators] = useState<IndicatorPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    async function loadIndicators() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/countries/${countryCode}/indicators`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Could not load economic indicators.");
        }

        const payload = (await response.json()) as IndicatorPayload;

        if (isActive) {
          setIndicators(payload);
        }
      } catch (loadError) {
        if (!controller.signal.aborted && isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load economic indicators.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadIndicators();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [countryCode]);

  if (isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            className="min-h-36 animate-pulse rounded-lg border border-white/10 bg-[#111827]/80 p-5"
            key={index}
          >
            <div className="h-4 w-28 rounded bg-white/10" />
            <div className="mt-6 h-9 w-24 rounded bg-white/10" />
            <div className="mt-5 h-3 w-32 rounded bg-white/10" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !indicators) {
    return (
      <div className="rounded-lg border border-red-400/20 bg-red-500/10 px-5 py-6 text-sm text-red-100">
        {error ?? "Could not load economic indicators."}
      </div>
    );
  }

  const cards = [
    {
      name: "GDP Growth",
      value: formatPercent(indicators.gdpGrowth.value),
      trend: indicators.gdpGrowth.trend ?? "flat",
      source: getMetricSource(indicators.gdpGrowth),
    },
    {
      name: "Inflation",
      value: formatPercent(indicators.inflation.value),
      trend: indicators.inflation.trend ?? "flat",
      source: getMetricSource(indicators.inflation),
    },
    {
      name: "Debt/GDP",
      value: formatPercent(indicators.debtToGdp.value),
      trend: "flat" as Trend,
      source: getMetricSource(indicators.debtToGdp),
    },
    {
      name: "Interest Rate",
      value: formatPercent(indicators.interestRate?.value ?? null),
      trend: "flat" as Trend,
      source: indicators.interestRate?.source ?? "No FRED data",
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          className="flex min-h-36 flex-col rounded-lg border border-white/10 bg-[#111827]/80 p-5 shadow-sm shadow-black/20"
          key={card.name}
        >
          <div className="text-sm font-medium text-slate-400">
            {card.name} (%)
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="text-3xl font-bold tracking-normal text-white">
              {card.value}
            </div>
            <TrendIcon trend={card.trend} />
          </div>
          <div className="mt-auto text-xs text-slate-500">{card.source}</div>
        </article>
      ))}
    </div>
  );
}

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === "up") {
    return (
      <span className="inline-flex size-8 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-300">
        <ArrowUp className="size-4" aria-hidden="true" />
      </span>
    );
  }

  if (trend === "down") {
    return (
      <span className="inline-flex size-8 items-center justify-center rounded-md bg-red-500/10 text-red-300">
        <ArrowDown className="size-4" aria-hidden="true" />
      </span>
    );
  }

  return (
    <span className="inline-flex size-8 items-center justify-center rounded-md bg-white/[0.04] text-slate-400">
      <ArrowRight className="size-4" aria-hidden="true" />
    </span>
  );
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "N/A";
  }

  return `${value.toFixed(1)}%`;
}

function getMetricSource(metric: IndicatorMetric) {
  return [metric.source ?? "Public data", metric.year ? `(${metric.year})` : ""]
    .filter(Boolean)
    .join(" ");
}
