import Link from "next/link";
import { ArrowRight, LogOut, Plus } from "lucide-react";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type PortfolioRow = {
  id: string;
  name: string;
  sector: string | null;
  geography: string | null;
  created_at: string;
};

async function signOut() {
  "use server";

  const supabase = createClient();
  await supabase.auth.signOut();

  redirect("/auth/login");
}

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

  const { data, error } = await supabase
    .from("portfolios")
    .select("id, name, sector, geography, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const portfolios = (data ?? []) as PortfolioRow[];

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-6 py-10">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2">
            <Link
              href="/dashboard"
              className="text-2xl font-semibold tracking-normal text-foreground"
            >
              GeoRisk AI
            </Link>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <form action={signOut}>
              <Button type="submit" variant="ghost" className="w-full sm:w-auto">
                <LogOut data-icon="inline-start" aria-hidden="true" />
                Sign out
              </Button>
            </form>
            <Button asChild className="w-full bg-primary hover:bg-primary/90 sm:w-auto">
              <Link href="/dashboard/portfolio/new">
                <Plus data-icon="inline-start" aria-hidden="true" />
                New Portfolio
              </Link>
            </Button>
          </div>
        </header>

        {error ? (
          <Card className="border-destructive/40 bg-destructive/10">
            <CardHeader>
              <CardTitle>Could not load portfolios</CardTitle>
              <CardDescription>
                Refresh the page or sign in again to continue.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : portfolios.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {portfolios.map((portfolio) => (
              <Card key={portfolio.id} className="flex min-h-64 flex-col">
                <CardHeader>
                  <CardTitle className="line-clamp-2">
                    {portfolio.name}
                  </CardTitle>
                  <CardDescription>
                    {portfolio.sector || "Sector not specified"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent">
                      Geography
                    </p>
                    <p className="line-clamp-3 text-sm leading-6 text-foreground">
                      {portfolio.geography || "Geography not specified"}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Created {formatDate(portfolio.created_at)}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href={`/dashboard/brief/${portfolio.id}`}>
                      View Brief
                      <ArrowRight data-icon="inline-end" aria-hidden="true" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="mx-auto flex w-full max-w-xl flex-col items-center px-6 py-14 text-center">
            <div className="text-5xl" aria-hidden="true">
              🌐
            </div>
            <CardHeader className="items-center p-0 pt-5">
              <CardTitle>No portfolios yet</CardTitle>
              <CardDescription>
                Create a portfolio to generate your first geopolitical exposure
                brief.
              </CardDescription>
            </CardHeader>
            <CardFooter className="p-0 pt-6">
              <Button asChild>
                <Link href="/dashboard/portfolio/new">
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  Create Your First Portfolio
                </Link>
              </Button>
            </CardFooter>
          </Card>
        )}
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
