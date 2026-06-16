/**
 * GET /api/auth/logout
 * Clears the session cookie and redirects to the login page.
 * Optionally redirects to Ping's end-session endpoint if configured.
 */

import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth/session";
import { pingConfig, validatePingConfig } from "@/lib/auth/pingConfig";

export async function GET(req: NextRequest) {
  await clearAuthCookies();

  // If Ping is configured, redirect to Ping's logout endpoint for SSO logout
  if (validatePingConfig() && pingConfig.endSessionEndpoint) {
    const logoutUrl = new URL(pingConfig.endSessionEndpoint);
    logoutUrl.searchParams.set(
      "post_logout_redirect_uri",
      `${process.env.NEXT_PUBLIC_APP_URL}/login`
    );
    return NextResponse.redirect(logoutUrl.toString());
  }

  return NextResponse.redirect(new URL("/login", req.url));
}
