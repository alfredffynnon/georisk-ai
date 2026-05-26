"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

const sectors = [
  "Energy",
  "Infrastructure",
  "Technology",
  "Financial Services",
  "Healthcare",
  "Real Estate",
  "Commodities",
  "Other",
] as const;

type Sector = (typeof sectors)[number];

type PortfolioForm = {
  name: string;
  sector: Sector;
  geography: string;
  assets: string;
  dependencies: string;
};

const initialForm: PortfolioForm = {
  name: "",
  sector: "Energy",
  geography: "",
  assets: "",
  dependencies: "",
};

const fieldClassName =
  "rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-ring/35";

export default function NewPortfolioPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState<PortfolioForm>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();

    if (!name) {
      setError("Portfolio name is required.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/auth/login");
        return;
      }

      const { data, error: insertError } = await supabase
        .from("portfolios")
        .insert({
          assets: cleanText(form.assets),
          dependencies: cleanText(form.dependencies),
          geography: cleanText(form.geography),
          name,
          sector: form.sector,
          user_id: user.id,
        })
        .select("id")
        .single();

      if (insertError) {
        throw insertError;
      }

      router.push(`/dashboard/brief/${data.id}`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not create portfolio.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateField<Field extends keyof PortfolioForm>(
    field: Field,
    value: PortfolioForm[Field],
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-6 py-10">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Button asChild variant="ghost" className="w-fit">
          <Link href="/dashboard">
            <ArrowLeft data-icon="inline-start" aria-hidden="true" />
            Cancel
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">New Portfolio</CardTitle>
            <CardDescription>
              Define the exposures GeoRisk AI should assess.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="flex flex-col gap-5">
              {error ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
                  {error}
                </p>
              ) : null}

              <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
                Portfolio Name
                <input
                  required
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  className={`h-11 ${fieldClassName}`}
                  placeholder="e.g. European Energy Infrastructure Fund"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
                Primary Sector
                <select
                  value={form.sector}
                  onChange={(event) =>
                    updateField("sector", event.target.value as Sector)
                  }
                  className={`h-11 ${fieldClassName}`}
                >
                  {sectors.map((sector) => (
                    <option key={sector} value={sector}>
                      {sector}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
                Key Geographies
                <textarea
                  value={form.geography}
                  onChange={(event) =>
                    updateField("geography", event.target.value)
                  }
                  className={`min-h-28 resize-y py-3 ${fieldClassName}`}
                  placeholder="e.g. Eastern Europe, Gulf States, Southeast Asia"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
                Key Assets & Holdings
                <textarea
                  value={form.assets}
                  onChange={(event) => updateField("assets", event.target.value)}
                  className={`min-h-28 resize-y py-3 ${fieldClassName}`}
                  placeholder="Describe your main assets, investments, or holdings"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
                Supply Chain Dependencies
                <textarea
                  value={form.dependencies}
                  onChange={(event) =>
                    updateField("dependencies", event.target.value)
                  }
                  className={`min-h-28 resize-y py-3 ${fieldClassName}`}
                  placeholder="Key suppliers, logistics routes, or critical dependencies"
                />
              </label>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button asChild variant="ghost" className="w-full sm:w-auto">
                <Link href="/dashboard">Cancel</Link>
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <Loader2
                    data-icon="inline-start"
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : null}
                {isSubmitting ? "Creating..." : "Create Portfolio"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </section>
    </main>
  );
}

function cleanText(value: string) {
  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}
