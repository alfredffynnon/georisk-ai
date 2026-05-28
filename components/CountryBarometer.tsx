"use client";

import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type RiskTrend = "improving" | "stable" | "deteriorating";

type BarometerData = {
  level: number;
  label: "Stable" | "Guarded" | "Elevated" | "High" | "Critical";
  rationale: string;
  trend: RiskTrend;
};

type CountryBarometerProps = {
  countryCode: string;
};

const levelStyles = {
  1: {
    color: "#22c55e",
    text: "text-emerald-200",
    ring: "shadow-emerald-500/20",
  },
  2: {
    color: "#14b8a6",
    text: "text-teal-200",
    ring: "shadow-teal-500/20",
  },
  3: {
    color: "#eab308",
    text: "text-yellow-100",
    ring: "shadow-yellow-500/20",
  },
  4: {
    color: "#f97316",
    text: "text-orange-200",
    ring: "shadow-orange-500/20",
  },
  5: {
    color: "#ef4444",
    text: "text-red-200",
    ring: "shadow-red-500/20",
  },
} as const;

export function CountryBarometer({ countryCode }: CountryBarometerProps) {
  const [barometer, setBarometer] = useState<BarometerData | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    async function loadBarometer() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/countries/${countryCode}/barometer`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Could not load risk barometer.");
        }

        const payload = (await response.json()) as BarometerData;

        if (isActive) {
          setBarometer(payload);
          setUpdatedAt(new Date());
        }
      } catch (loadError) {
        if (!controller.signal.aborted && isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load risk barometer.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadBarometer();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [countryCode]);

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] animate-pulse flex-col items-center justify-center gap-8 border-y border-white/10 bg-[#0d1424] px-6 py-10">
        <div className="size-48 rounded-full bg-white/10" />
        <div className="h-8 w-48 rounded bg-white/10" />
        <div className="h-4 w-80 max-w-full rounded bg-white/10" />
      </div>
    );
  }

  if (error || !barometer) {
    return (
      <div className="border-y border-red-400/20 bg-red-500/10 px-5 py-8 text-center text-sm text-red-100">
        {error ?? "Could not load risk barometer."}
      </div>
    );
  }

  const level = clampLevel(barometer.level);
  const style = levelStyles[level];
  const fillDegrees = level * 72;

  return (
    <div className="border-y border-white/10 bg-[#0d1424] px-5 py-10 shadow-inner shadow-black/20 sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-7 text-center">
        <div
          className={cn(
            "relative grid size-60 place-items-center rounded-full p-3 shadow-2xl md:size-72",
            style.ring,
          )}
          style={{
            background: `conic-gradient(${style.color} ${fillDegrees}deg, rgba(255,255,255,0.08) 0deg)`,
          }}
        >
          <div className="grid size-full place-items-center rounded-full border border-white/10 bg-[#0a0e1a]">
            <div>
              <div className="text-sm font-medium uppercase tracking-normal text-slate-500">
                Level {level} / 5
              </div>
              <div className={cn("mt-2 text-5xl font-bold", style.text)}>
                {barometer.label}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl">
          <p className="text-base leading-7 text-slate-300">
            {barometer.rationale}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-400">
            <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
              <TrendIcon trend={barometer.trend} />
              Trend: {barometer.trend}
            </span>
            <span className="text-slate-500">
              Last updated: {formatUpdatedAt(updatedAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendIcon({ trend }: { trend: RiskTrend }) {
  if (trend === "improving") {
    return <ArrowDown className="size-4 text-emerald-300" aria-hidden="true" />;
  }

  if (trend === "deteriorating") {
    return <ArrowUp className="size-4 text-red-300" aria-hidden="true" />;
  }

  return <ArrowRight className="size-4 text-slate-400" aria-hidden="true" />;
}

function clampLevel(level: number): 1 | 2 | 3 | 4 | 5 {
  if (level <= 1) {
    return 1;
  }

  if (level >= 5) {
    return 5;
  }

  return Math.round(level) as 1 | 2 | 3 | 4 | 5;
}

function formatUpdatedAt(value: Date | null) {
  if (!value) {
    return "N/A";
  }

  return value.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
