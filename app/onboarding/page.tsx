"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { COUNTRIES } from "@/lib/countries";
import { cn } from "@/lib/utils";

const industryVerticals = [
  "Energy & Infrastructure",
  "Private Credit",
  "Commodities Trading",
  "Real Estate",
  "Asset Management",
  "Other",
] as const;

const marketCodes = ["DE", "GB", "AE"] as const;
const globalContextCodes = ["US", "RU"] as const;
const currencyCodes = ["USD", "EUR", "GBP", "AED", "RUB"] as const;

const riskAppetites = [
  {
    label: "Conservative",
    description: "Prioritise early warnings, lower thresholds, and downside protection.",
  },
  {
    label: "Moderate",
    description: "Balance strategic opportunity with active exposure monitoring.",
  },
  {
    label: "Aggressive",
    description: "Track high-volatility signals that may create asymmetric upside.",
  },
] as const;

const steps = [
  {
    title: "Your Organisation",
    caption: "Organisation profile",
  },
  {
    title: "Market Exposure",
    caption: "Operating markets",
  },
  {
    title: "Asset Profile",
    caption: "Intelligence calibration",
  },
] as const;

type IndustryVertical = (typeof industryVerticals)[number];
type MarketCode = (typeof marketCodes)[number];
type CurrencyCode = (typeof currencyCodes)[number];
type RiskAppetite = (typeof riskAppetites)[number]["label"];

type OnboardingForm = {
  companyName: string;
  industryVertical: IndustryVertical | "";
  markets: MarketCode[];
  keyAssets: string;
  supplyChain: string;
  currencyExposure: CurrencyCode[];
  riskAppetite: RiskAppetite;
};

type OnboardingResponse = {
  exists?: boolean;
  success?: boolean;
  profileId?: string;
  error?: string;
};

const initialForm: OnboardingForm = {
  companyName: "",
  industryVertical: "",
  markets: [],
  keyAssets: "",
  supplyChain: "",
  currencyExposure: ["USD", "EUR"],
  riskAppetite: "Moderate",
};

const fieldClassName =
  "rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-ring/35";

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState<OnboardingForm>(initialForm);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const progressWidth = useMemo(
    () => `${((currentStep + 1) / steps.length) * 100}%`,
    [currentStep],
  );

  function updateField<Field extends keyof OnboardingForm>(
    field: Field,
    value: OnboardingForm[Field],
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function toggleMarket(marketCode: MarketCode) {
    setForm((currentForm) => {
      const isSelected = currentForm.markets.includes(marketCode);

      return {
        ...currentForm,
        markets: isSelected
          ? currentForm.markets.filter((code) => code !== marketCode)
          : [...currentForm.markets, marketCode],
      };
    });
  }

  function toggleCurrency(currencyCode: CurrencyCode) {
    setForm((currentForm) => {
      const isSelected = currentForm.currencyExposure.includes(currencyCode);

      return {
        ...currentForm,
        currencyExposure: isSelected
          ? currentForm.currencyExposure.filter((code) => code !== currencyCode)
          : [...currentForm.currencyExposure, currencyCode],
      };
    });
  }

  function goToNextStep() {
    if (!validateStep(currentStep)) {
      return;
    }

    setError(null);
    setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
  }

  function goToPreviousStep() {
    setError(null);
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateStep(2)) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyName: form.companyName.trim(),
          currencyExposure: form.currencyExposure,
          industryVertical: form.industryVertical,
          keyAssets: form.keyAssets.trim(),
          markets: form.markets,
          riskAppetite: form.riskAppetite,
          supplyChain: cleanOptionalText(form.supplyChain),
        }),
      });

      const payload = (await response
        .json()
        .catch(() => null)) as OnboardingResponse | null;

      if (response.status === 401) {
        router.replace("/auth/login");
        return;
      }

      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not activate intelligence.");
      }

      if (payload?.exists || payload?.success) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      throw new Error("Could not activate intelligence.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not activate intelligence.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function validateStep(step: number) {
    if (step === 0) {
      if (!form.companyName.trim()) {
        setError("Company or fund name is required.");
        return false;
      }

      if (!form.industryVertical) {
        setError("Select an industry vertical.");
        return false;
      }
    }

    if (step === 1 && form.markets.length === 0) {
      setError("Select at least one operating market.");
      return false;
    }

    if (step === 2 && !form.keyAssets.trim()) {
      setError("Key assets are required.");
      return false;
    }

    return true;
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-6 py-8">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-7">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-3xl flex-col gap-3">
            <div className="flex items-center gap-3 text-xs font-semibold uppercase text-accent">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Client Intelligence Activation
            </div>
            <h1 className="text-3xl font-semibold tracking-normal text-foreground md:text-4xl">
              Calibrate GeoRisk AI to your operating reality.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Define the organisation, markets, and asset-level exposures that
              shape your geopolitical risk picture.
            </p>
          </div>

          <div className="rounded-md border border-white/10 bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm shadow-black/20">
            <span className="font-medium text-foreground">
              Step {currentStep + 1}
            </span>{" "}
            of {steps.length}
          </div>
        </header>

        <div
          aria-label="Onboarding progress"
          aria-valuemax={steps.length}
          aria-valuemin={1}
          aria-valuenow={currentStep + 1}
          className="h-2 overflow-hidden rounded-full bg-secondary"
          role="progressbar"
        >
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: progressWidth }}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="h-fit rounded-md border border-white/10 bg-card p-4 shadow-sm shadow-black/20">
            <ol className="flex flex-col gap-2">
              {steps.map((step, index) => {
                const isActive = currentStep === index;
                const isComplete = currentStep > index;

                return (
                  <li
                    className={cn(
                      "rounded-md border px-4 py-3 transition-colors",
                      isActive
                        ? "border-accent bg-accent/10"
                        : "border-white/10 bg-background/40",
                    )}
                    key={step.title}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-md border text-xs font-semibold",
                          isComplete
                            ? "border-accent bg-accent text-accent-foreground"
                            : "border-white/15 text-muted-foreground",
                        )}
                      >
                        {isComplete ? (
                          <Check className="size-4" aria-hidden="true" />
                        ) : (
                          `0${index + 1}`
                        )}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="text-sm font-medium text-foreground">
                          {step.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {step.caption}
                        </span>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </aside>

          <form
            className="rounded-md border border-white/10 bg-card shadow-2xl shadow-black/25"
            noValidate
            onSubmit={handleSubmit}
          >
            <div className="border-b border-white/10 p-6 md:p-8">
              <p className="text-sm font-medium uppercase text-accent">
                {steps[currentStep].caption}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal text-foreground md:text-3xl">
                {steps[currentStep].title}
              </h2>
              {currentStep === 2 ? (
                <p className="mt-3 text-base leading-7 text-foreground">
                  This is what makes your intelligence unique.
                </p>
              ) : null}
            </div>

            <div className="flex min-h-[460px] flex-col gap-6 p-6 md:p-8">
              {error ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
                  {error}
                </p>
              ) : null}

              {currentStep === 0 ? (
                <YourOrganisationStep form={form} updateField={updateField} />
              ) : null}

              {currentStep === 1 ? (
                <MarketExposureStep
                  selectedMarkets={form.markets}
                  toggleMarket={toggleMarket}
                />
              ) : null}

              {currentStep === 2 ? (
                <AssetProfileStep
                  form={form}
                  toggleCurrency={toggleCurrency}
                  updateField={updateField}
                />
              ) : null}
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 p-6 md:flex-row md:items-center md:justify-between md:p-8">
              <Button
                className="w-full md:w-auto"
                disabled={currentStep === 0 || isSubmitting}
                onClick={goToPreviousStep}
                type="button"
                variant="ghost"
              >
                <ArrowLeft data-icon="inline-start" aria-hidden="true" />
                Back
              </Button>

              {currentStep < steps.length - 1 ? (
                <Button
                  className="h-11 w-full md:w-auto"
                  onClick={goToNextStep}
                  type="button"
                >
                  Continue
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  className="h-11 w-full bg-accent text-accent-foreground hover:bg-accent/90 md:w-auto"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? (
                    <Loader2
                      className="animate-spin"
                      data-icon="inline-start"
                      aria-hidden="true"
                    />
                  ) : (
                    <ShieldCheck data-icon="inline-start" aria-hidden="true" />
                  )}
                  {isSubmitting ? "Activating..." : "Activate Intelligence"}
                </Button>
              )}
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

function YourOrganisationStep({
  form,
  updateField,
}: {
  form: OnboardingForm;
  updateField: <Field extends keyof OnboardingForm>(
    field: Field,
    value: OnboardingForm[Field],
  ) => void;
}) {
  return (
    <div className="grid gap-5">
      <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
        Company/fund name
        <input
          autoComplete="organization"
          className={`h-11 ${fieldClassName}`}
          onChange={(event) => updateField("companyName", event.target.value)}
          placeholder="e.g. Northstar Energy Infrastructure Fund"
          required
          value={form.companyName}
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
        Industry vertical
        <select
          className={`h-11 ${fieldClassName}`}
          onChange={(event) =>
            updateField(
              "industryVertical",
              event.target.value as IndustryVertical | "",
            )
          }
          required
          value={form.industryVertical}
        >
          <option value="">Select industry vertical</option>
          {industryVerticals.map((industryVertical) => (
            <option key={industryVertical} value={industryVertical}>
              {industryVertical}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function MarketExposureStep({
  selectedMarkets,
  toggleMarket,
}: {
  selectedMarkets: MarketCode[];
  toggleMarket: (marketCode: MarketCode) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
        Select the markets you operate in. We will monitor these countries and
        surface relevant intelligence for your portfolio.
      </p>

      <div className="grid gap-3 md:grid-cols-3">
        {marketCodes.map((marketCode) => {
          const country = COUNTRIES[marketCode];
          const isSelected = selectedMarkets.includes(marketCode);

          return (
            <label
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-md border p-4 transition-colors",
                isSelected
                  ? "border-accent bg-accent/10"
                  : "border-white/10 bg-background/40 hover:border-white/25",
              )}
              key={marketCode}
            >
              <input
                checked={isSelected}
                className="sr-only"
                onChange={() => toggleMarket(marketCode)}
                type="checkbox"
              />
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded border",
                  isSelected
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-white/20",
                )}
                aria-hidden="true"
              >
                {isSelected ? <Check className="size-4" /> : null}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-base font-medium text-foreground">
                  {country.flag} {country.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {marketCode} · {country.region}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      <div className="border-t border-white/10 pt-6">
        <div className="grid gap-3 md:grid-cols-2">
          {globalContextCodes.map((marketCode) => {
            const country = COUNTRIES[marketCode];

            return (
              <label
                className="flex items-center gap-3 rounded-md border border-white/10 bg-secondary/70 p-4 text-muted-foreground"
                key={marketCode}
              >
                <input checked disabled className="sr-only" type="checkbox" />
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded border border-accent bg-accent text-accent-foreground"
                  aria-hidden="true"
                >
                  <Check className="size-4" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-base font-medium text-foreground">
                    {country.flag} {country.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Global Context — always monitored
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Developments in these markets affect all portfolios.
        </p>
      </div>
    </div>
  );
}

function AssetProfileStep({
  form,
  toggleCurrency,
  updateField,
}: {
  form: OnboardingForm;
  toggleCurrency: (currencyCode: CurrencyCode) => void;
  updateField: <Field extends keyof OnboardingForm>(
    field: Field,
    value: OnboardingForm[Field],
  ) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
        Key assets
        <textarea
          className={`min-h-32 resize-y py-3 ${fieldClassName}`}
          onChange={(event) => updateField("keyAssets", event.target.value)}
          placeholder="e.g. 2 LNG terminals in Hamburg, pipeline infrastructure across Central Europe, FSRU vessel in Rotterdam"
          required
          value={form.keyAssets}
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
        Supply chain dependencies
        <textarea
          className={`min-h-28 resize-y py-3 ${fieldClassName}`}
          onChange={(event) => updateField("supplyChain", event.target.value)}
          placeholder="e.g. Russian gas transit, Chinese lithium supply, Strait of Hormuz shipping routes"
          value={form.supplyChain}
        />
      </label>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium text-foreground">
          Currency exposure
        </legend>
        <div className="flex flex-wrap gap-3">
          {currencyCodes.map((currencyCode) => {
            const isSelected = form.currencyExposure.includes(currencyCode);

            return (
              <label
                className={cn(
                  "flex h-11 cursor-pointer items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors",
                  isSelected
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-white/10 bg-background/40 text-muted-foreground hover:border-white/25",
                )}
                key={currencyCode}
              >
                <input
                  checked={isSelected}
                  className="sr-only"
                  onChange={() => toggleCurrency(currencyCode)}
                  type="checkbox"
                />
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded border",
                    isSelected
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-white/20",
                  )}
                  aria-hidden="true"
                >
                  {isSelected ? <Check className="size-3" /> : null}
                </span>
                {currencyCode}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium text-foreground">
          Risk appetite
        </legend>
        <div className="grid gap-3 lg:grid-cols-3">
          {riskAppetites.map((riskAppetite) => {
            const isSelected = form.riskAppetite === riskAppetite.label;

            return (
              <label
                className={cn(
                  "flex cursor-pointer flex-col gap-3 rounded-md border p-4 transition-colors",
                  isSelected
                    ? "border-accent bg-accent/10"
                    : "border-white/10 bg-background/40 hover:border-white/25",
                )}
                key={riskAppetite.label}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-base font-semibold text-foreground">
                    {riskAppetite.label}
                  </span>
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border",
                      isSelected
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-white/20",
                    )}
                    aria-hidden="true"
                  >
                    {isSelected ? <Check className="size-4" /> : null}
                  </span>
                </span>
                <input
                  checked={isSelected}
                  className="sr-only"
                  name="riskAppetite"
                  onChange={() =>
                    updateField("riskAppetite", riskAppetite.label)
                  }
                  type="radio"
                />
                <span className="text-sm leading-6 text-muted-foreground">
                  {riskAppetite.description}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

function cleanOptionalText(value: string) {
  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}
