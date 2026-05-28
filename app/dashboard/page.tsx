import Link from "next/link";
import { ArrowRight, LogOut, Pencil } from "lucide-react";
import { redirect } from "next/navigation";

import { SignalFeed } from "@/components/SignalFeed";
import { Button } from "@/components/ui/button";
import { COUNTRIES, type CountryCode } from "@/lib/countries";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { CompanyProfile } from "@/lib/types";

export default async function DashboardPage() {
  if (!hasSupabaseConfig()) {
    redirect("/auth/login");
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
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
    redirect("/onboarding");
  }

  const companyProfile = profile as CompanyProfile;
  const monitoredCountries = getMonitoredCountries(companyProfile.markets);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#0a0e1a] px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-10">
        <header className="grid gap-5 border-b border-white/10 pb-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <Link
            href="/dashboard"
            className="text-xl font-semibold tracking-normal text-white"
          >
            GeoRisk AI
          </Link>

          <div className="text-left lg:text-center">
            <h1 className="text-2xl font-semibold tracking-normal text-white">
              {companyProfile.company_name}
            </h1>
          </div>

          <nav className="flex flex-col gap-2 sm:flex-row lg:justify-end">
            <Button
              asChild
              className="border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] hover:text-white"
              variant="outline"
            >
              <Link href="/onboarding">
                <Pencil aria-hidden="true" />
                Edit Profile
              </Link>
            </Button>
            <Button
              asChild
              className="border-white/10 bg-transparent text-slate-300 hover:bg-white/[0.08] hover:text-white"
              variant="outline"
            >
              <Link href="/auth/logout">
                <LogOut aria-hidden="true" />
                Logout
              </Link>
            </Button>
          </nav>
        </header>

        <section className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span
                className="relative flex size-3"
                aria-label="Live intelligence active"
              >
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex size-3 rounded-full bg-emerald-400" />
              </span>
              <h2 className="text-2xl font-semibold tracking-normal text-white md:text-3xl">
                Live Intelligence Feed
              </h2>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-slate-400">
              Signals ranked by relevance to {companyProfile.company_name}
              &apos;s portfolio — updated in real time
            </p>
          </div>

          <SignalFeed />
        </section>

        <section className="flex flex-col gap-5 pb-8">
          <h2 className="text-2xl font-semibold tracking-normal text-white md:text-3xl">
            Monitored Markets
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            {monitoredCountries.map(({ code, country }) => {
              const isGlobalContext = code === "US" || code === "RU";

              return (
                <article
                  className="flex min-h-64 flex-col rounded-lg border border-white/10 bg-[#111827]/80 p-5 shadow-sm shadow-black/20"
                  key={code}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="text-6xl leading-none" aria-hidden="true">
                      {country.flag}
                    </div>
                    {isGlobalContext ? (
                      <span className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[11px] font-medium uppercase tracking-normal text-cyan-100">
                        Global Context
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-5 flex flex-1 flex-col gap-3">
                    <div>
                      <h3 className="text-xl font-semibold tracking-normal text-white">
                        {country.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {country.region}
                      </p>
                    </div>

                    <p className="text-sm text-slate-400">Risk Level: —</p>

                    <Button
                      asChild
                      className="mt-auto w-full border-white/10 bg-white/[0.04] text-slate-100 hover:bg-cyan-300 hover:text-[#0a0e1a]"
                      variant="outline"
                    >
                      <Link href={`/dashboard/${code.toLowerCase()}`}>
                        View Intelligence
                        <ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                  </div>
                </article>
              );
            })}
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
