"use client";

import { FormEvent, useState } from "react";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import type { CountryCode } from "@/lib/countries";
import type { AlertSettings } from "@/lib/types";
import { cn } from "@/lib/utils";

type PoliticalRiskThreshold = "1" | "2" | "3" | "4" | "5";

type AlertCountryCardProps = {
  code: CountryCode;
  country: {
    flag: string;
    name: string;
    region: string;
  };
  settings: AlertSettings | null;
};

const thresholdOptions: Array<{
  label: string;
  value: PoliticalRiskThreshold;
}> = [
  { label: "1 - Stable", value: "1" },
  { label: "2 - Guarded", value: "2" },
  { label: "3 - Elevated", value: "3" },
  { label: "4 - High", value: "4" },
  { label: "5 - Critical", value: "5" },
];

export function AlertCountryCard({
  code,
  country,
  settings,
}: AlertCountryCardProps) {
  const [enabled, setEnabled] = useState(settings?.enabled ?? true);
  const [politicalRiskLevel, setPoliticalRiskLevel] =
    useState<PoliticalRiskThreshold>(
      normalizePoliticalRiskLevel(settings?.political_risk_level),
    );
  const [rateMoveThreshold, setRateMoveThreshold] = useState(
    String(settings?.rate_move_threshold ?? 0.5),
  );
  const [emailEnabled, setEmailEnabled] = useState(
    settings?.email_enabled ?? true,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedThreshold = Number(rateMoveThreshold);

    if (
      !rateMoveThreshold.trim() ||
      !Number.isFinite(parsedThreshold) ||
      parsedThreshold <= 0
    ) {
      setError("Enter a positive rate move threshold.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/alerts", {
        body: JSON.stringify([
          {
            country_code: code,
            email_enabled: emailEnabled,
            enabled,
            political_risk_level: politicalRiskLevel,
            rate_move_threshold: parsedThreshold,
          },
        ]),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const payload = (await response
        .json()
        .catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not save alert settings.");
      }

      toast({
        description: `${country.name} alert settings have been updated.`,
        title: "Settings saved",
      });
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Could not save alert settings.";

      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      className="flex h-full flex-col rounded-lg border border-white/10 bg-[#111827]/90 p-5 shadow-sm shadow-black/20"
      onSubmit={handleSubmit}
    >
      <header className="flex items-start gap-4 border-b border-white/10 pb-5">
        <div className="text-5xl leading-none" aria-hidden="true">
          {country.flag}
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-normal text-white">
            {country.name}
          </h2>
          <p className="mt-1 text-sm text-slate-400">{country.region}</p>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 py-5">
        <ToggleRow
          checked={enabled}
          id={`${code}-alerts-enabled`}
          label="Alerts enabled"
          onCheckedChange={setEnabled}
        />

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
          Political risk threshold
          <select
            className="h-10 rounded-md border border-white/10 bg-[#0a0e1a] px-3 text-sm text-white outline-none transition-colors focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/25"
            onChange={(event) =>
              setPoliticalRiskLevel(
                event.target.value as PoliticalRiskThreshold,
              )
            }
            value={politicalRiskLevel}
          >
            {thresholdOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="text-xs leading-5 text-slate-500">
            Alert only above this level.
          </span>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
          Rate move threshold (%)
          <input
            className="h-10 rounded-md border border-white/10 bg-[#0a0e1a] px-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/25"
            inputMode="decimal"
            min="0.1"
            onChange={(event) => setRateMoveThreshold(event.target.value)}
            step="0.1"
            type="number"
            value={rateMoveThreshold}
          />
        </label>

        <ToggleRow
          checked={emailEnabled}
          id={`${code}-email-enabled`}
          label="Email alerts"
          onCheckedChange={setEmailEnabled}
        />
      </div>

      <div className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-5">
        <Button
          className="h-10 w-full border-cyan-300/30 bg-cyan-300 text-[#0a0e1a] hover:bg-cyan-200"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Save aria-hidden="true" />
          )}
          Save Settings
        </Button>

        {error ? (
          <p className="text-sm font-medium text-red-200">{error}</p>
        ) : null}
      </div>
    </form>
  );
}

function ToggleRow({
  checked,
  id,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  id: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm font-medium text-slate-200" htmlFor={id}>
        {label}
      </label>
      <button
        aria-checked={checked}
        className={cn(
          "relative h-6 w-11 rounded-full border border-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40",
          checked ? "bg-cyan-300" : "bg-slate-700",
        )}
        id={id}
        onClick={() => onCheckedChange(!checked)}
        role="switch"
        type="button"
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 size-5 rounded-full bg-white transition-transform",
            checked && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}

function normalizePoliticalRiskLevel(
  value: string | null | undefined,
): PoliticalRiskThreshold {
  const normalizedValue = value?.toLowerCase();

  if (normalizedValue === "stable" || normalizedValue === "1") {
    return "1";
  }

  if (normalizedValue === "guarded" || normalizedValue === "2") {
    return "2";
  }

  if (normalizedValue === "high" || normalizedValue === "4") {
    return "4";
  }

  if (normalizedValue === "critical" || normalizedValue === "5") {
    return "5";
  }

  return "3";
}
