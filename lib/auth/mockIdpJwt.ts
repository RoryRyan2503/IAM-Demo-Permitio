/**
 * Mock IDP — JWT issuance & verification
 *
 * After the local mock IDP authenticates a user (lib/auth/mockIdp.ts), this
 * module issues a signed, short-lived JWT carrying ONLY identity claims:
 *
 *   sub (user_id), email, given_name, family_name, iss, aud, iat, exp
 *
 * No roles/tools/accounts are ever embedded in the token — PingAuthorize
 * resolves those at decision time from the entitlement store (CRM/Supabase),
 * keyed by `sub`. This mirrors the target flow:
 *
 *   Mock IDP → signed JWT (identity) → app → PingAuthorize PDP → entitlements
 *
 * Uses HS256 via `jose` (already a project dependency) with a secret from
 * MOCK_IDP_JWT_SECRET. Isolated behind env vars so this can later be swapped
 * for Cognito/PingOne/Entra ID/Okta without touching call sites.
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { MockIdpUser } from "@/lib/auth/mockIdp";

const ISSUER = process.env.MOCK_IDP_ISSUER ?? "local-mock-idp";
const AUDIENCE = process.env.MOCK_IDP_AUDIENCE ?? "pingauthorize-poc";

// Demo-only fallback secret so the app still runs out of the box; a real
// deployment MUST set MOCK_IDP_JWT_SECRET via environment configuration.
const SECRET_VALUE = process.env.MOCK_IDP_JWT_SECRET ?? "iam-poc-local-mock-idp-dev-secret-change-me";
if (!process.env.MOCK_IDP_JWT_SECRET && process.env.NODE_ENV !== "production") {
  console.warn("[mockIdp] MOCK_IDP_JWT_SECRET is not set — using an insecure development default.");
}
const SECRET = new TextEncoder().encode(SECRET_VALUE);

/** Token lifetime — kept short per POC security boundary. */
const TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

export interface MockIdpJwtClaims extends JWTPayload {
  sub: string;
  email: string;
  given_name: string;
  family_name: string;
}

export async function issueMockIdpJwt(user: MockIdpUser): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    email: user.email,
    given_name: user.firstName,
    family_name: user.lastName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + TOKEN_TTL_SECONDS)
    .sign(SECRET);
}

/** Verifies signature, issuer, and audience. Returns claims or null if invalid/expired. */
export async function verifyMockIdpJwt(token: string): Promise<MockIdpJwtClaims | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return payload as MockIdpJwtClaims;
  } catch {
    return null;
  }
}
