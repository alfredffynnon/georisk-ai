"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";

type ExpertProfile = {
  name: string;
  role: string;
  tags: string[];
  yearsExperience: number;
};

type RequestState = "idle" | "submitting" | "success" | "error";

const experts: ExpertProfile[] = [
  {
    name: "Dr. Sarah Hoffmann",
    role: "Former Bundesbank Senior Economist, Germany & EU monetary policy",
    tags: ["Germany", "Monetary Policy", "EU Macro"],
    yearsExperience: 22,
  },
  {
    name: "James Whitmore",
    role: "Former FCO Senior Analyst, Russia & Eastern Europe",
    tags: ["Russia", "Eastern Europe", "Political Risk"],
    yearsExperience: 18,
  },
  {
    name: "Dr. Fatima Al-Rashid",
    role: "Former UAE Ministry of Economy Advisor, Gulf markets & sovereign wealth",
    tags: ["Gulf Markets", "Sovereign Wealth", "UAE"],
    yearsExperience: 15,
  },
  {
    name: "Prof. Michael Chen",
    role: "Former US Treasury International Affairs, G7 & sanctions policy",
    tags: ["G7", "Sanctions", "US Treasury"],
    yearsExperience: 25,
  },
  {
    name: "Elena Volkov",
    role: "Former Central Bank of Russia Research Director, Russian monetary & FX policy",
    tags: ["Russia", "FX Policy", "Central Banking"],
    yearsExperience: 20,
  },
  {
    name: "Dr. Oliver Hart",
    role: "Former IMF Middle East Division, Regional macro & crisis analysis",
    tags: ["Middle East", "Crisis Analysis", "IMF"],
    yearsExperience: 17,
  },
];

const urgencyOptions = [
  {
    label: "Standard 3-5 days",
    value: "standard",
  },
  {
    label: "Priority 24-48 hours",
    value: "priority",
  },
  {
    label: "Emergency 4 hours",
    value: "emergency",
  },
] as const;

export default function ExpertsPage() {
  const router = useRouter();
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [selectedExpert, setSelectedExpert] =
    useState<ExpertProfile | null>(null);
  const [question, setQuestion] = useState("");
  const [urgency, setUrgency] =
    useState<(typeof urgencyOptions)[number]["value"]>("standard");
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      if (!hasSupabaseConfig()) {
        router.replace("/auth/login");
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/auth/login");
        return;
      }

      if (isMounted) {
        setIsLoadingAuth(false);
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  function openRequestModal(expert: ExpertProfile) {
    setSelectedExpert(expert);
    setQuestion("");
    setUrgency("standard");
    setRequestState("idle");
    setError(null);
  }

  function closeRequestModal() {
    setSelectedExpert(null);
    setQuestion("");
    setUrgency("standard");
    setRequestState("idle");
    setError(null);
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedExpert) {
      return;
    }

    if (!question.trim()) {
      setRequestState("error");
      setError("Question is required.");
      return;
    }

    setRequestState("submitting");
    setError(null);

    try {
      const response = await fetch("/api/experts/enquiry", {
        body: JSON.stringify({
          expert_name: selectedExpert.name,
          question: question.trim(),
          urgency,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const payload = (await response
        .json()
        .catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not submit request.");
      }

      setRequestState("success");
    } catch (submitError) {
      setRequestState("error");
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not submit request.",
      );
    }
  }

  if (isLoadingAuth) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#0a0e1a] px-6 text-white">
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <Loader2 className="animate-spin" aria-hidden="true" />
          Loading expert network...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#0a0e1a] px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-6">
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

          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-6 text-cyan-100">
              Beta &mdash; Expert consultations are currently facilitated by the
              GeoRisk AI team. Direct booking launches Q3 2026.
            </div>
            <h1 className="text-3xl font-semibold tracking-normal text-white sm:text-4xl">
              Expert Network
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">
              On-demand access to former policymakers, central bankers, and
              regional specialists
            </p>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {experts.map((expert) => (
            <Card className="flex bg-[#111827]/90" key={expert.name}>
              <div className="flex w-full flex-col">
                <CardHeader>
                  <CardTitle>{expert.name}</CardTitle>
                  <CardDescription>{expert.role}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-5">
                  <div className="flex flex-wrap gap-2">
                    {expert.tags.map((tag) => (
                      <Badge
                        className="border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
                        key={tag}
                        variant="outline"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm font-medium text-slate-300">
                    {expert.yearsExperience} years experience
                  </p>
                  <Button
                    className="mt-auto w-full border-white/10 bg-transparent text-slate-100 hover:bg-cyan-300 hover:text-[#0a0e1a]"
                    onClick={() => openRequestModal(expert)}
                    type="button"
                    variant="outline"
                  >
                    Request Consultation
                  </Button>
                </CardContent>
              </div>
            </Card>
          ))}
        </section>
      </section>

      {selectedExpert ? (
        <div
          aria-labelledby="consultation-dialog-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6"
          role="dialog"
        >
          <div className="w-full max-w-xl rounded-lg border border-white/10 bg-[#111827] p-6 text-white shadow-xl shadow-black/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  className="text-2xl font-semibold tracking-normal"
                  id="consultation-dialog-title"
                >
                  Request Consultation
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {selectedExpert.name}
                </p>
              </div>
              <Button
                aria-label="Close consultation request"
                className="size-9 shrink-0 border-white/10 bg-transparent text-slate-300 hover:bg-white/[0.08] hover:text-white"
                onClick={closeRequestModal}
                size="icon"
                type="button"
                variant="outline"
              >
                <X aria-hidden="true" />
              </Button>
            </div>

            {requestState === "success" ? (
              <div className="mt-6 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm font-medium leading-6 text-cyan-100">
                Your request has been logged. Our team will connect you within
                the selected timeframe.
              </div>
            ) : (
              <form className="mt-6 flex flex-col gap-5" onSubmit={submitRequest}>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                  What do you need to know?
                  <textarea
                    className="min-h-36 rounded-md border border-white/10 bg-[#0a0e1a] px-3 py-3 text-sm leading-6 text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/25"
                    onChange={(event) => setQuestion(event.target.value)}
                    required
                    value={question}
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                  Urgency
                  <select
                    className="h-11 rounded-md border border-white/10 bg-[#0a0e1a] px-3 text-sm text-white outline-none transition-colors focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/25"
                    onChange={(event) =>
                      setUrgency(
                        event.target
                          .value as (typeof urgencyOptions)[number]["value"],
                      )
                    }
                    value={urgency}
                  >
                    {urgencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    className="h-11 bg-cyan-300 px-6 text-sm text-[#0a0e1a] hover:bg-cyan-200"
                    disabled={requestState === "submitting"}
                    type="submit"
                  >
                    {requestState === "submitting" ? (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    ) : null}
                    Submit Request
                  </Button>

                  {requestState === "error" && error ? (
                    <p className="text-sm font-medium text-red-200">{error}</p>
                  ) : null}
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
