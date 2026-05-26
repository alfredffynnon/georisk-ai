import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams?: {
    error?: string;
    redirectedFrom?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  async function logIn(formData: FormData) {
    "use server";

    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      redirectWithError("/auth/login", "Email and password are required.");
    }

    let errorMessage: string | null = null;

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      errorMessage = error?.message ?? null;
    } catch (error) {
      errorMessage =
        error instanceof Error ? error.message : "Could not log in.";
    }

    if (errorMessage) {
      redirectWithError("/auth/login", errorMessage);
    }

    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-md border border-white/10 bg-card p-8 shadow-2xl shadow-black/30">
        <div className="mb-8 flex flex-col gap-3">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent">
            Welcome back
          </p>
          <h1 className="text-3xl font-semibold tracking-normal text-foreground">
            Login to GeoRisk AI
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Continue to the private risk intelligence workspace.
          </p>
        </div>

        {searchParams?.error ? (
          <p className="mb-5 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
            {searchParams.error}
          </p>
        ) : searchParams?.redirectedFrom ? (
          <p className="mb-5 rounded-md border border-white/10 bg-secondary px-4 py-3 text-sm text-muted-foreground">
            Login to continue to the dashboard.
          </p>
        ) : null}

        <form action={logIn} className="flex flex-col gap-5">
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
            Email
            <input
              required
              name="email"
              type="email"
              autoComplete="email"
              className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-ring/35"
              placeholder="you@example.com"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
            Password
            <input
              required
              name="password"
              type="password"
              autoComplete="current-password"
              className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-ring/35"
              placeholder="Password"
            />
          </label>

          <Button type="submit" className="mt-2 h-11">
            Login
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Need an account?{" "}
          <Link
            href="/auth/signup"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </section>
    </main>
  );
}

function redirectWithError(pathname: string, message: string): never {
  redirect(`${pathname}?error=${encodeURIComponent(message)}`);
}
