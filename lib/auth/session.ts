/**
 * Session Management
 *
 * Sessions are stored as httpOnly cookies containing the user's JWT claims.
 * This approach avoids localStorage (XSS risk) and keeps the server stateless.
 *
 * Cookie layout:
 *   "iam_session" — base64-encoded JSON of AuthSession (includes JWT + claims)
 *
 * Security:
 *   - httpOnly: JS cannot access the cookie (XSS protection)
 *   - secure: cookie only sent over HTTPS (set to true in production)
 *   - sameSite: "lax" — protects against CSRF for most use cases
 *   - The JWT itself is verified on every authenticated API request
 */

import { cookies } from "next/headers";
import { decodeJwt } from "jose";
import type { AuthSession, UserRole } from "@/types";

export const SESSION_COOKIE = "iam_session";
export const PKCE_VERIFIER_COOKIE = "iam_pkce_verifier";
export const OAUTH_STATE_COOKIE = "iam_oauth_state";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

// ---------------------------------------------------------------------------
// Cookie setters (server-side: Route Handlers / Server Actions)
// ---------------------------------------------------------------------------

/**
 * Store the PKCE code_verifier in a short-lived httpOnly cookie.
 * Called before redirecting to the Ping authorization endpoint.
 */
export async function setPkceVerifierCookie(verifier: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PKCE_VERIFIER_COOKIE, verifier, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes — long enough to complete login
    path: "/",
  });
}

/**
 * Store the OAuth state in a short-lived httpOnly cookie.
 * Validated in the callback to prevent CSRF.
 */
export async function setStateCookie(state: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });
}

/**
 * Store the authenticated session after successful token exchange.
 * The session cookie persists until token expiry.
 */
export async function setSessionCookie(session: AuthSession): Promise<void> {
  const cookieStore = await cookies();
  const encoded = Buffer.from(JSON.stringify(session)).toString("base64");
  const maxAge = Math.max(0, session.expiresAt - Math.floor(Date.now() / 1000));

  cookieStore.set(SESSION_COOKIE, encoded, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    maxAge: maxAge || 60 * 60, // fallback 1 hour
    path: "/",
  });
}

/**
 * Clear all auth cookies (used on logout).
 */
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(PKCE_VERIFIER_COOKIE);
  cookieStore.delete(OAUTH_STATE_COOKIE);
}

// ---------------------------------------------------------------------------
// Cookie getters (server-side)
// ---------------------------------------------------------------------------

export async function getPkceVerifierFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(PKCE_VERIFIER_COOKIE)?.value ?? null;
}

export async function getStateFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(OAUTH_STATE_COOKIE)?.value ?? null;
}

/**
 * Retrieve and decode the session from the httpOnly cookie.
 * Returns null if the cookie is missing or malformed.
 *
 * NOTE: This does NOT verify the JWT signature — use verifySession() for
 * security-critical checks. This is fine for UI rendering decisions.
 */
export async function getSession(): Promise<AuthSession | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(SESSION_COOKIE)?.value;
    if (!raw) return null;

    const decoded = Buffer.from(raw, "base64").toString("utf-8");
    const session = JSON.parse(decoded) as AuthSession;

    // Reject obviously expired sessions
    if (session.expiresAt < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// JWT parsing utilities
// ---------------------------------------------------------------------------

/**
 * Parse claims from a raw JWT string without signature verification.
 * Used to extract user info from the Ping access/ID token after we've
 * already validated it server-side in the callback.
 *
 * Claims mapping (standard OIDC + Ping custom claims):
 *   sub     → userId
 *   email   → email
 *   name    → name (or given_name + family_name)
 *   role    → role (Ping custom claim configured in token mapping)
 */
export function parseJwtClaims(token: string): {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  expiresAt: number;
} {
  const payload = decodeJwt(token);

  const userId = (payload.sub as string) ?? "unknown";
  const email = (payload.email as string) ?? "";
  const derivedName =
    `${(payload.given_name as string) ?? ""} ${(payload.family_name as string) ?? ""}`.trim();
  const name = (payload.name as string) ?? (derivedName || email);

  // Ping can deliver role as a custom claim — falls back to "viewer"
  const rawRole = payload.role ?? payload["custom:role"] ?? "viewer";
  const role = (
    ["admin", "buyer", "viewer"].includes(rawRole as string)
      ? rawRole
      : "viewer"
  ) as UserRole;

  const expiresAt = (payload.exp as number) ?? Math.floor(Date.now() / 1000) + 3600;

  return { userId, email, name, role, expiresAt };
}

// ---------------------------------------------------------------------------
// Demo mode: mock session (when Ping is not configured)
// ---------------------------------------------------------------------------

/**
 * Creates a mock session for demo/development use.
 * Activated when Ping env vars are not configured.
 *
 * This allows the app to run and demonstrate authorization patterns
 * without a live Ping Identity environment.
 */
export function createDemoSession(
  persona: "admin" | "buyer" | "viewer" = "buyer"
): AuthSession {
  const demoUsers = {
    admin: {
      userId: "user-admin",
      email: "admin@demo.com",
      name: "Miguel Patel",
      role: "admin" as UserRole,
    },
    buyer: {
      userId: "user-buyer",
      email: "buyer@demo.com",
      name: "Carlos Johnson",
      role: "buyer" as UserRole,
    },
    viewer: {
      userId: "user-viewer",
      email: "viewer@demo.com",
      name: "Sarah Chen",
      role: "viewer" as UserRole,
    },
  };

  const user = demoUsers[persona];
  return {
    ...user,
    accessToken: `demo-token-${persona}`,
    expiresAt: Math.floor(Date.now() / 1000) + 3600 * 8, // 8 hours
  };
}
