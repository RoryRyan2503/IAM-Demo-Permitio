/**
 * POST /api/auth/login
 *
 * Initiates the Ping Identity OIDC + PKCE authorization flow.
 *
 * Flow:
 *   1. Generate PKCE code_verifier + code_challenge (S256)
 *   2. Generate state (CSRF protection)
 *   3. Store code_verifier and state in httpOnly cookies
 *   4. Redirect browser to Ping authorization endpoint
 *
 * Demo mode:
 *   If Ping is not configured, creates a demo session directly.
 *   Query param ?persona=admin|buyer|viewer selects the demo user.
 */

import { NextRequest, NextResponse } from "next/server";
import { pingConfig, validatePingConfig } from "@/lib/auth/pingConfig";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from "@/lib/auth/pkce";
import {
  setPkceVerifierCookie,
  setStateCookie,
  setSessionCookie,
  createDemoSession,
} from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const isPingConfigured = validatePingConfig();

  // ------------------------------------------------------------------
  // Demo mode: skip Ping, create a local session immediately
  // ------------------------------------------------------------------
  if (!isPingConfigured) {
    const persona =
      (req.nextUrl.searchParams.get("persona") as "admin" | "buyer" | "viewer") ??
      "buyer";
    const session = createDemoSession(persona);
    await setSessionCookie(session);

    return NextResponse.redirect(new URL("/home", req.url));
  }

  // ------------------------------------------------------------------
  // Real OIDC + PKCE flow
  // ------------------------------------------------------------------
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  // Store PKCE verifier and state in secure httpOnly cookies
  await setPkceVerifierCookie(codeVerifier);
  await setStateCookie(state);

  // Build the Ping authorization URL
  const authUrl = new URL(pingConfig.authorizationEndpoint);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", pingConfig.clientId);
  authUrl.searchParams.set("redirect_uri", pingConfig.redirectUri);
  authUrl.searchParams.set("scope", pingConfig.scopes.join(" "));
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  return NextResponse.redirect(authUrl.toString());
}
