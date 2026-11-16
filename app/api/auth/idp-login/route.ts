/**
 * POST /api/auth/idp-login
 *
 * "Enterprise Login" — authenticates against the local mock IDP
 * (username/password) and, on success, issues a signed JWT + session cookie.
 *
 * Flow:
 *   1. Validate request body (reject malformed input)
 *   2. Verify credentials against the mock IDP directory (identity only)
 *   3. Issue + self-verify a signed JWT (sub/username/email/given_name/
 *      family_name/iss/aud/iat/exp)
 *   4. Resolve the user's role from the entitlement store (CRM/Supabase) —
 *      mirrors the existing demo-login pattern; used only for coarse
 *      route-gating in middleware.ts, never for authorization decisions
 *   5. Store the session cookie (same shape/flow as demo login)
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyMockIdpCredentials } from "@/lib/auth/mockIdp";
import { issueMockIdpJwt, verifyMockIdpJwt } from "@/lib/auth/mockIdpJwt";
import { setSessionCookie } from "@/lib/auth/session";
import { getUserContext } from "@/lib/crm/crmService";
import type { AuthSession } from "@/types";

const MAX_INPUT_LENGTH = 100;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { username, password } = (body ?? {}) as { username?: unknown; password?: unknown };

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    !username.trim() ||
    !password ||
    username.length > MAX_INPUT_LENGTH ||
    password.length > MAX_INPUT_LENGTH
  ) {
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }

  const idpUser = verifyMockIdpCredentials(username, password);
  if (!idpUser) {
    // Generic message — avoid revealing whether the username exists
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const jwt = await issueMockIdpJwt(idpUser);
  const claims = await verifyMockIdpJwt(jwt); // defensive self-check (signature/iss/aud)
  if (!claims || !claims.exp) {
    console.error("[idp-login] Issued token failed self-verification");
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }

  const { user } = await getUserContext(idpUser.userId, idpUser.email);

  const session: AuthSession = {
    userId: idpUser.userId,
    email: idpUser.email,
    name: `${idpUser.firstName} ${idpUser.lastName}`,
    role: user.role,
    accessToken: jwt,
    expiresAt: claims.exp,
  };

  await setSessionCookie(session);

  return NextResponse.json({ ok: true, redirect: "/home" });
}
