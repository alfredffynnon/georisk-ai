import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { COUNTRIES, type CountryCode } from "@/lib/countries";

type CountryDashboardPageProps = {
  params: {
    countryCode: string;
  };
};

export default function CountryDashboardPage({
  params,
}: CountryDashboardPageProps) {
  const countryCode = params.countryCode.toUpperCase();

  if (!isCountryCode(countryCode)) {
    redirect("/dashboard");
  }

  const country = COUNTRIES[countryCode];

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#0a0e1a] px-6 py-10 text-white">
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        <div className="text-8xl leading-none md:text-9xl" aria-hidden="true">
          {country.flag}
        </div>
        <h1 className="mt-8 text-4xl font-semibold tracking-normal text-white md:text-5xl">
          {country.name}
        </h1>
        <p className="mt-4 text-base text-slate-400">
          Full country dashboard coming in next build
        </p>
        <Button
          asChild
          className="mt-8 border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08] hover:text-white"
          variant="outline"
        >
          <Link href="/dashboard">
            <ArrowLeft aria-hidden="true" />
            Back to Dashboard
          </Link>
        </Button>
      </section>
    </main>
  );
}

function isCountryCode(countryCode: string): countryCode is CountryCode {
  return Object.prototype.hasOwnProperty.call(COUNTRIES, countryCode);
}
