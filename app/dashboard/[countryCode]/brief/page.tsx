import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { COUNTRIES, type CountryCode } from "@/lib/countries";

type CountryBriefPageProps = {
  params: {
    countryCode: string;
  };
};

export default function CountryBriefPage({ params }: CountryBriefPageProps) {
  const countryCode = params.countryCode.toUpperCase();

  if (!isCountryCode(countryCode)) {
    redirect("/dashboard");
  }

  const country = COUNTRIES[countryCode];

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#0a0e1a] px-6 py-10 text-white">
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        <h1 className="text-3xl font-semibold tracking-normal text-white md:text-5xl">
          <span aria-hidden="true">{country.flag}</span> {country.name} Intelligence Brief
        </h1>
        <p className="mt-4 text-base text-slate-400">
          Brief generation coming in next build
        </p>
        <Button
          asChild
          className="mt-8 border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08] hover:text-white"
          variant="outline"
        >
          <Link href={`/dashboard/${countryCode.toLowerCase()}`}>
            <ArrowLeft aria-hidden="true" />
            Back to {country.name}
          </Link>
        </Button>
      </section>
    </main>
  );
}

function isCountryCode(countryCode: string): countryCode is CountryCode {
  return Object.prototype.hasOwnProperty.call(COUNTRIES, countryCode);
}
