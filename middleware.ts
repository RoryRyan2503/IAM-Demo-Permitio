/**
 * Next.js Middleware — Route Protection
 *
 * Runs on the Edge runtime before every matched request.
 *
 * Rules:
 *   1. Public routes (login, callback) — always allow
 *   2. API routes — allow (auth checked in route handlers)
 *   3. /admin routes — require admin role
 *   4. All other protected routes — require valid session
 *
 * The middleware adds x-user-id header so route handlers
 * can trust the authenticated user ID without re-reading the cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { decodeJwt } from "jose";
import type { AuthSession } from "@/types";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/api/auth/login", "/api/auth/callback", "/403", "/access-denied"];
// Routes that require admin role
const ADMIN_ROUTES = ["/admin"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some((route) => pathname.startsWith(route));
}

function parseSessionCookie(cookieValue: string): AuthSession | null {
  try {
    const decoded = Buffer.from(cookieValue, "base64").toString("utf-8");
    return JSON.parse(decoded) as AuthSession;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static files, _next, and public API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    isPublicRoute(pathname)
  ) {
    return NextResponse.next();
  }

  // Read session cookie
  const sessionCookieValue = req.cookies.get(SESSION_COOKIE)?.value;

  // No session — redirect to login
  if (!sessionCookieValue) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Parse session
  const session = parseSessionCookie(sessionCookieValue);

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Check session expiry
  if (session.expiresAt && Date.now() > session.expiresAt * 1000) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("reason", "session_expired");
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  // Admin route protection
  if (isAdminRoute(pathname) && session.role !== "admin") {
    const deniedUrl = new URL("/access-denied", req.url);
    deniedUrl.searchParams.set("resource", pathname);
    return NextResponse.redirect(deniedUrl);
  }

  // Inject user ID into request headers for route handlers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", session.userId);
  requestHeaders.set("x-user-role", session.role);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
