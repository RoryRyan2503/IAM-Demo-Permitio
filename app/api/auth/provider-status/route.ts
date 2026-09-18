/**
 * GET /api/auth/provider-status
 *
 * Lightweight, non-admin health check for the active authorization provider.
 * Backs the header connection status badge (visible to every signed-in user).
 */

import { NextRequest, NextResponse } from "next/server";
import { validateRequest, authErrorResponse } from "@/lib/api/validateRequest";
import { getAuthorizationProvider, getActiveProviderName } from "@/lib/authorization/providerFactory";

export async function GET(req: NextRequest) {
  try {
    await validateRequest(req);

    const provider = getAuthorizationProvider();
    const status = await provider.getConnectivityStatus();

    return NextResponse.json({
      provider: getActiveProviderName(),
      providerLabel: provider.getProviderName(),
      connected: status.connected,
      message: status.message,
    });
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
