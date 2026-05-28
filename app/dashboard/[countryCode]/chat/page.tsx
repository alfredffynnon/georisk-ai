import { redirect } from "next/navigation";

import { COUNTRIES, type CountryCode } from "@/lib/countries";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { CompanyProfile } from "@/lib/types";

import { ChatInterface } from "./chat-interface";

type CountryChatPageProps = {
  params: {
    countryCode: string;
  };
};

export default async function CountryChatPage({ params }: CountryChatPageProps) {
  const countryCode = params.countryCode.toUpperCase();

  if (!isCountryCode(countryCode)) {
    redirect("/dashboard");
  }

  if (!hasSupabaseConfig()) {
    redirect("/auth/login");
  }

  const supabase = await createClient();
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

  return (
    <ChatInterface
      companyName={(profile as CompanyProfile).company_name}
      country={COUNTRIES[countryCode]}
      countryCode={countryCode}
    />
  );
}

function isCountryCode(countryCode: string): countryCode is CountryCode {
  return Object.prototype.hasOwnProperty.call(COUNTRIES, countryCode);
}
