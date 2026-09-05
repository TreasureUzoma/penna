import { NextRequest, NextResponse } from "next/server";

const ACCESS_COOKIE = "pennaAccessToken";
const REFRESH_COOKIE = "pennaRefreshToken";
const API_URL = process.env.API_URL || "http://localhost:3005";

// Everything under (app) — requires a session, redirects to /login otherwise.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/projects",
  "/settings",
  "/new",
  "/username",
  "/onboarding",
  "/billings",
  "/activity",
];

// Entry forms only — visiting these while already signed in just bounces
// back to the dashboard. Token-driven auth pages (forgot/reset-password,
// verify-email) are deliberately left out: they're valid to open in either
// session state.
const AUTH_ENTRY_PREFIXES = ["/login", "/signup"];

function hasSessionCookie(request: NextRequest) {
  return (
    request.cookies.has(ACCESS_COOKIE) || request.cookies.has(REFRESH_COOKIE)
  );
}

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

// Cookie presence only proves a session was issued at some point, not that
// it's still good — an expired access token with a spent refresh token
// leaves the cookie sitting in the jar with nothing valid behind it. That's
// fine for the "protect this page" direction (worst case: the API 401s the
// data fetch), but fatal for "bounce signed-in users off /login": a false
// positive there permanently locks someone out of ever reaching the login
// form again. So this direction asks the API — the thing that's actually
// been returning the correct 401 the whole time — instead of guessing.
async function hasValidSession(request: NextRequest): Promise<boolean> {
  if (!hasSessionCookie(request)) return false;
  try {
    const res = await fetch(`${API_URL}/api/v1/profile`, {
      headers: { cookie: request.headers.get("cookie") ?? "" },
    });
    return res.ok;
  } catch {
    // API unreachable — don't let that block access to the login page.
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (matches(pathname, PROTECTED_PREFIXES) && !hasSessionCookie(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    matches(pathname, AUTH_ENTRY_PREFIXES) &&
    (await hasValidSession(request))
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

// This only gates the page shell — the API still enforces the real
// authorization on every request via `withAuth` (apps/server/middlewares/session.ts).
// A stale/expired cookie still gets past this check and is caught there.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/settings/:path*",
    "/new/:path*",
    "/username/:path*",
    "/onboarding/:path*",
    "/billings/:path*",
    "/activity/:path*",
    "/login",
    "/signup",
  ],
};
