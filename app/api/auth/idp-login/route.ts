/**
 * POST /api/auth/idp-login
 *
 * "Enterprise Login" — authenticates a DynamoDB user with the shared demo
 * password and, on success, issues a signed JWT + session cookie.
 *
 * Flow:
 *   1. Validate request body (reject malformed input)
 *   2. Verify the shared demo password and load identity from DynamoDB
 *   3. Issue + self-verify a signed JWT (sub/email/given_name/family_name/
 *      iss/aud/iat/exp)
 *   4. Resolve the user's role and account context from DynamoDB to build
 *      the session; API operations are still evaluated by PingAuthorize.
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

  const { userId, password } = (body ?? {}) as { userId?: unknown; password?: unknown };

  if (
    typeof userId !== "string" ||
    typeof password !== "string" ||
    !userId.trim() ||
    !password ||
    userId.length > MAX_INPUT_LENGTH ||
    password.length > MAX_INPUT_LENGTH
  ) {
    return NextResponse.json({ error: "Select a user and enter the shared password" }, { status: 400 });
  }

  try {
    const idpUser = await verifyMockIdpCredentials(userId, password);
    if (!idpUser) {
      return NextResponse.json({ error: "Invalid user or password" }, { status: 401 });
    }

    const jwt = await issueMockIdpJwt(idpUser);
    const claims = await verifyMockIdpJwt(jwt);
    if (!claims || !claims.exp) {
      console.error("[idp-login] Issued token failed self-verification");
      return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
    }

    const { user } = await getUserContext(idpUser.userId, idpUser.email, undefined, "dynamodb");
    const session: AuthSession = {
      userId: idpUser.userId,
      email: idpUser.email,
      name: `${idpUser.firstName} ${idpUser.lastName}`.trim(),
      honId: idpUser.honId,
      role: user.role,
      accessToken: jwt,
      expiresAt: claims.exp,
      identitySource: "dynamodb",
    };

    await setSessionCookie(session);
    return NextResponse.json({ ok: true, redirect: "/home" });
  } catch (error) {
    console.error("[idp-login] DynamoDB authentication failed:", error);
    const status = (error as { statusCode?: number }).statusCode ?? 503;
    return NextResponse.json({ error: "Unable to authenticate with the user directory." }, { status });
  }
}
