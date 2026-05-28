"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { AlertCountryCard } from "@/app/alerts/alert-country-card";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { COUNTRIES, type CountryCode } from "@/lib/countries";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import type { AlertSettings, CompanyProfile } from "@/lib/types";

type LoadState = "loading" | "ready" | "error";

export default function AlertsPage() {
  const router = useRouter();
  const [companyProfile, setCompanyProfile] =
    useState<CompanyProfile | null>(null);
  const [alertSettings, setAlertSettings] = useState<AlertSettings[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAlerts() {
      if (!hasSupabaseConfig()) {
        router.replace("/auth/login");
        return;
      }

      try {
        const supabase = createClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/auth/login");
          return;
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
          router.replace("/onboarding");
          return;
        }

        const { data: settingsRows, error: settingsError } = await supabase
          .from("alert_settings")
          .select("*")
          .eq("user_id", user.id);

        if (settingsError) {
          throw settingsError;
        }

        if (!isMounted) {
          return;
        }

        setCompanyProfile(profile as CompanyProfile);
        setAlertSettings((settingsRows ?? []) as AlertSettings[]);
        setLoadState("ready");
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setLoadState("error");
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load alert settings.",
        );
      }
    }

    loadAlerts();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const monitoredCountries = useMemo(
    () => getMonitoredCountries(companyProfile?.markets ?? []),
    [companyProfile?.markets],
  );

  const alertSettingsByCountry = useMemo(
    () =>
      new Map(
        alertSettings.map((settings) => [
          settings.country_code.toUpperCase(),
          settings,
        ]),
      ),
    [alertSettings],
  );

  if (loadState === "loading") {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#0a0e1a] px-6 text-white">
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <Loader2 className="animate-spin" aria-hidden="true" />
          Loading alert settings...
        </div>
      </main>
    );
  }

  if (loadState === "error") {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-[#0a0e1a] px-4 py-6 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 rounded-lg border border-white/10 bg-[#111827]/90 p-6">
          <h1 className="text-2xl font-semibold tracking-normal">
            Alert Configuration
          </h1>
          <p className="text-sm leading-6 text-red-200">
            {error ?? "Could not load alert settings."}
          </p>
          <Button asChild className="w-fit" variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#0a0e1a] px-4 py-6 text-white sm:px-6 lg:px-8">
      <Toaster />
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-10">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4">
            <Button
              asChild
              className="w-fit border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300/40 hover:bg-white/[0.08] hover:text-white"
              variant="outline"
            >
              <Link href="/dashboard">
                <ArrowLeft aria-hidden="true" />
                Dashboard
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-semibold tracking-normal text-white sm:text-4xl">
                Alert Configuration
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">
                Set thresholds for automatic notifications when high-relevance
                events occur in your monitored markets.
              </p>
            </div>
          </div>

          {companyProfile ? (
            <div className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm font-medium text-cyan-100">
              {companyProfile.company_name}
            </div>
          ) : null}
        </header>

        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {monitoredCountries.map(({ code, country }) => (
            <AlertCountryCard
              code={code}
              country={country}
              key={code}
              settings={alertSettingsByCountry.get(code) ?? null}
            />
          ))}
        </section>

        <section className="flex flex-col gap-5 pb-8">
          <h2 className="text-2xl font-semibold tracking-normal text-white md:text-3xl">
            Recent Alerts
          </h2>
          <div className="rounded-lg border border-white/10 bg-[#111827]/90 p-8 text-sm leading-6 text-slate-300 shadow-sm shadow-black/20">
            No alerts triggered yet. Alerts will appear here when monitored
            events exceed your thresholds.
          </div>
        </section>
      </section>
    </main>
  );
}

function getMonitoredCountries(markets: string[] | null) {
  const profileMarkets = Array.isArray(markets) ? markets : [];
  const countryCodes = [...profileMarkets, "US", "RU"]
    .map((countryCode) => countryCode.toUpperCase())
    .filter(isCountryCode);

  return Array.from(new Set(countryCodes)).map((code) => ({
    code,
    country: COUNTRIES[code],
  }));
}

function isCountryCode(countryCode: string): countryCode is CountryCode {
  return Object.prototype.hasOwnProperty.call(COUNTRIES, countryCode);
}
