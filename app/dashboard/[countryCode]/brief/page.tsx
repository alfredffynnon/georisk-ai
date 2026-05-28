import { redirect } from "next/navigation";

import { COUNTRIES, type CountryCode } from "@/lib/countries";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { BriefContent, CompanyProfile } from "@/lib/types";

import { CountryBriefWorkspace } from "./brief-client";

type CountryBriefPageProps = {
  params: {
    countryCode: string;
  };
};

export default async function CountryBriefPage({
  params,
}: CountryBriefPageProps) {
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

  const { data: latestBrief, error: latestBriefError } = await supabase
    .from("country_briefs")
    .select("brief_content, created_at")
    .eq("user_id", user.id)
    .eq("company_profile_id", profile.id)
    .eq("country_code", countryCode)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestBriefError) {
    throw latestBriefError;
  }

  return (
    <CountryBriefWorkspace
      companyName={(profile as CompanyProfile).company_name}
      country={COUNTRIES[countryCode]}
      countryCode={countryCode}
      initialBrief={
        latestBrief
          ? {
              brief: latestBrief.brief_content as BriefContent,
              generatedAt: latestBrief.created_at,
            }
          : null
      }
    />
  );
}

function isCountryCode(countryCode: string): countryCode is CountryCode {
  return Object.prototype.hasOwnProperty.call(COUNTRIES, countryCode);
}
