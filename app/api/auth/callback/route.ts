/**
 * GET /api/auth/callback
 *
 * Handles the OIDC authorization code callback from Ping Identity.
 *
 * Flow:
 *   1. Validate state parameter (CSRF check)
 *   2. Retrieve code_verifier from cookie
 *   3. Exchange authorization code + verifier for tokens
 *   4. Parse JWT claims to build AuthSession
 *   5. Store session in httpOnly cookie
 *   6. Redirect to /dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import { pingConfig } from "@/lib/auth/pingConfig";
import {
  getPkceVerifierFromCookie,
  getStateFromCookie,
  setSessionCookie,
  clearAuthCookies,
  parseJwtClaims,
} from "@/lib/auth/session";
import type { AuthSession } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");
  const error = searchParams.get("error");

  // ------------------------------------------------------------------
  // Handle errors from Ping
  // ------------------------------------------------------------------
  if (error) {
    const errorDescription = searchParams.get("error_description") ?? error;
    console.error("[Auth Callback] Ping returned error:", errorDescription);
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(errorDescription)}`,
        req.url
      )
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=missing_code", req.url)
    );
  }

  // ------------------------------------------------------------------
  // CSRF check: validate state parameter
  // ------------------------------------------------------------------
  const savedState = await getStateFromCookie();
  if (!savedState || savedState !== returnedState) {
    console.error("[Auth Callback] State mismatch — possible CSRF attack");
    await clearAuthCookies();
    return NextResponse.redirect(
      new URL("/login?error=state_mismatch", req.url)
    );
  }

  // ------------------------------------------------------------------
  // PKCE: retrieve code_verifier
  // ------------------------------------------------------------------
  const codeVerifier = await getPkceVerifierFromCookie();
  if (!codeVerifier) {
    console.error("[Auth Callback] Missing PKCE code_verifier cookie");
    await clearAuthCookies();
    return NextResponse.redirect(
      new URL("/login?error=missing_verifier", req.url)
    );
  }

  // ------------------------------------------------------------------
  // Token exchange
  // ------------------------------------------------------------------
  try {
    const tokenResponse = await fetch(pingConfig.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: pingConfig.redirectUri,
        client_id: pingConfig.clientId,
        client_secret: pingConfig.clientSecret,
        code_verifier: codeVerifier,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const body = await tokenResponse.text();
      console.error("[Auth Callback] Token exchange failed:", body);
      await clearAuthCookies();
      return NextResponse.redirect(
        new URL("/login?error=token_exchange_failed", req.url)
      );
    }

    const tokens = await tokenResponse.json();
    const accessToken: string = tokens.access_token;
    const idToken: string = tokens.id_token ?? accessToken;

    // Parse claims from the ID token (preferred) or access token
    const claims = parseJwtClaims(idToken);

    const session: AuthSession = {
      userId: claims.userId,
      email: claims.email,
      name: claims.name,
      role: claims.role,
      accessToken,
      expiresAt: claims.expiresAt,
    };

    await setSessionCookie(session);
    await clearAuthCookies(); // Clear PKCE + state cookies (no longer needed)

    return NextResponse.redirect(new URL("/home", req.url));
  } catch (err) {
    console.error("[Auth Callback] Unexpected error:", err);
    await clearAuthCookies();
    return NextResponse.redirect(
      new URL("/login?error=server_error", req.url)
    );
  }
}
