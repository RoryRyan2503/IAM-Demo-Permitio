/**
 * GET  /api/admin/auth-provider — current provider status
 * POST /api/admin/auth-provider — switch the active provider at runtime
 *
 * Admin-only. Backs the "Provider" panel in the Admin Console (Overview tab),
 * implementing the Phase 3 requirement that switching between Permit.io and
 * PingAuthorize never requires a code change or restart.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateRequest, authErrorResponse } from "@/lib/api/validateRequest";
import {
  getActiveProviderName,
  getRuntimeProviderOverride,
  setRuntimeProviderOverride,
  listAvailableProviders,
  getProviderByName,
} from "@/lib/authorization/providerFactory";
import { listPolicySets } from "@/services/ping-authorize/policySets";
import { listPolicies } from "@/services/ping-authorize/policies";
import { getPolicyManagerConfigWarning } from "@/services/ping-authorize/client";

export async function GET(req: NextRequest) {
  try {
    const { userContext } = await validateRequest(req);
    if (userContext.user.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const active = getActiveProviderName();

    // Policy Manager counts are best-effort: a misconfigured or unreachable
    // real tenant must never break this endpoint (which the whole Admin
    // Console header depends on).
    const [permitStatus, pingStatus, policySetsResult, policiesResult] = await Promise.all([
      getProviderByName("permit").getConnectivityStatus(),
      getProviderByName("ping").getConnectivityStatus(),
      listPolicySets().then(
        (data) => ({ ok: true as const, data }),
        (error) => ({ ok: false as const, error: error instanceof Error ? error.message : String(error) })
      ),
      listPolicies().then(
        (data) => ({ ok: true as const, data }),
        (error) => ({ ok: false as const, error: error instanceof Error ? error.message : String(error) })
      ),
    ]);

    return NextResponse.json({
      active,
      envDefault: process.env.AUTH_PROVIDER === "ping" ? "ping" : "permit",
      runtimeOverride: getRuntimeProviderOverride(),
      available: listAvailableProviders(),
      connectivity: { permit: permitStatus, ping: pingStatus },
      pingConfigWarning: getPolicyManagerConfigWarning(),
      counts: {
        policySets: policySetsResult.ok ? policySetsResult.data.length : null,
        policies: policiesResult.ok ? policiesResult.data.length : null,
      },
      countsError: !policySetsResult.ok ? policySetsResult.error : !policiesResult.ok ? policiesResult.error : undefined,
    });
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userContext } = await validateRequest(req);
    if (userContext.user.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const provider = body.provider === null ? null : body.provider;

    if (provider !== null && provider !== "permit" && provider !== "ping") {
      return NextResponse.json({ error: "provider must be 'permit', 'ping', or null (clear override)" }, { status: 400 });
    }

    setRuntimeProviderOverride(provider);

    return NextResponse.json({ active: getActiveProviderName(), runtimeOverride: getRuntimeProviderOverride() });
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
