import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import {
  getSupabaseConfig,
  hasSupabaseConfig,
} from "@/lib/supabase/config";

export async function updateSession(request: NextRequest) {
  const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard");

  if (!hasSupabaseConfig()) {
    return isDashboardRoute ? redirectToLogin(request) : NextResponse.next();
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

  if (isDashboardRoute && (error || !data?.claims)) {
    return redirectToLogin(request);
  }

  return supabaseResponse;
}

function redirectToLogin(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/auth/login";
  redirectUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname);

  return NextResponse.redirect(redirectUrl);
}
