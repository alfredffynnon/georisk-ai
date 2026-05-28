import Link from "next/link";
import { ArrowLeft, ArrowRight, MessageSquareText, ScrollText } from "lucide-react";
import { redirect } from "next/navigation";

import { CountryBarometer } from "@/components/CountryBarometer";
import { CountryNewsFeed } from "@/components/CountryNewsFeed";
import { EconomicIndicators } from "@/components/EconomicIndicators";
import { Button } from "@/components/ui/button";
import { COUNTRIES, type CountryCode } from "@/lib/countries";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { CompanyProfile } from "@/lib/types";

type CountryDashboardPageProps = {
  params: {
    countryCode: string;
  };
};

export default async function CountryDashboardPage({
  params,
}: CountryDashboardPageProps) {
  const countryCode = params.countryCode.toUpperCase();

  if (!isCountryCode(countryCode)) {
    redirect("/dashboard");
  }

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
  const country = COUNTRIES[countryCode];
  const countryPath = `/dashboard/${countryCode.toLowerCase()}`;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#0a0e1a] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10">
        <header className="grid gap-5 border-b border-white/10 pb-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <Link
            href="/dashboard"
            className="inline-flex w-fit items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-cyan-300/40 hover:text-white"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            /dashboard
          </Link>

          <h1 className="text-left text-2xl font-semibold tracking-normal text-white sm:text-3xl lg:text-center">
            <span aria-hidden="true">{country.flag}</span> {country.name}
          </h1>

          <div className="flex lg:justify-end">
            <span className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-normal text-cyan-100">
              {country.region}
            </span>
          </div>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-normal text-white md:text-2xl">
            Risk Barometer
          </h2>
          <CountryBarometer countryCode={countryCode} />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-normal text-white md:text-2xl">
            Economic Indicators
          </h2>
          <EconomicIndicators countryCode={countryCode} />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-normal text-white md:text-2xl">
            Intelligence Feed
          </h2>
          <CountryNewsFeed countryCode={countryCode} />
        </section>

        <section className="grid gap-3 border-t border-white/10 pb-8 pt-6 md:grid-cols-2">
          <Button
            asChild
            className="h-12 border-cyan-300/30 bg-cyan-300 text-[#0a0e1a] hover:bg-cyan-200"
          >
            <Link
              aria-label={`Generate intelligence brief for ${companyProfile.company_name}`}
              href={`${countryPath}/brief`}
            >
              <ScrollText aria-hidden="true" />
              Generate Intelligence Brief
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <Button
            asChild
            className="h-12 border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08] hover:text-white"
            variant="outline"
          >
            <Link href={`${countryPath}/chat`}>
              <MessageSquareText aria-hidden="true" />
              Chat with {country.name} Agent
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </section>
      </div>
    </main>
  );
}

function isCountryCode(countryCode: string): countryCode is CountryCode {
  return Object.prototype.hasOwnProperty.call(COUNTRIES, countryCode);
}
