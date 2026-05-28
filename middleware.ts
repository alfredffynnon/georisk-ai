import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import {
  getSupabaseConfig,
  hasSupabaseConfig,
} from "@/lib/supabase/config";

const PROTECTED_ROUTE_PREFIXES = [
  "/dashboard",
  "/alerts",
  "/onboarding",
  "/experts",
] as const;

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = isProtectedPath(pathname);
  const isDashboardRoute = matchesRoutePrefix(pathname, "/dashboard");
  const isOnboardingRoute = matchesRoutePrefix(pathname, "/onboarding");

  if (!hasSupabaseConfig()) {
    return isProtectedRoute ? redirectToLogin(request) : NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const { supabaseKey, supabaseUrl } = getSupabaseConfig();
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, options, value }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();

  if (isProtectedRoute && (error || !data?.claims)) {
    return redirectToLogin(request);
  }

  if (data?.claims && (isDashboardRoute || isOnboardingRoute)) {
    const userId =
      typeof data.claims.sub === "string" ? data.claims.sub : null;

    if (!userId) {
      return redirectToLogin(request);
    }

    const { data: companyProfile, error: companyProfileError } = await supabase
      .from("company_profiles")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (!companyProfileError) {
      if (isDashboardRoute && !companyProfile) {
        return redirectToPath(request, "/onboarding");
      }

      if (isOnboardingRoute && companyProfile) {
        return redirectToPath(request, "/dashboard");
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

function isProtectedPath(pathname: string) {
  return PROTECTED_ROUTE_PREFIXES.some((prefix) =>
    matchesRoutePrefix(pathname, prefix)
  );
}

function matchesRoutePrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function redirectToLogin(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/auth/login";
  redirectUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname);

  return NextResponse.redirect(redirectUrl);
}

function redirectToPath(request: NextRequest, pathname: string) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = pathname;
  redirectUrl.search = "";

  return NextResponse.redirect(redirectUrl);
}
