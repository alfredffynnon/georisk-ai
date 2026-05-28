import Link from "next/link";
import { ArrowRight, LogOut } from "lucide-react";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

async function signOut() {
  "use server";

  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect("/auth/login");
}

async function getCurrentUser() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user;
  } catch {
    return null;
  }
}

export async function Navigation() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-white/10 bg-background">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-semibold tracking-normal text-foreground"
        >
          GeoRisk AI
        </Link>

        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <form action={signOut}>
                <Button type="submit" variant="secondary" size="sm">
                  <LogOut className="size-4" aria-hidden="true" />
                  Logout
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/auth/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/#waitlist">
                  Get early access
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
