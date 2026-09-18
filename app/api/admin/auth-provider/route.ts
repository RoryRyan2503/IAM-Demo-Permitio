/**
 * GET /api/admin/auth-provider — current provider status
 *
 * Admin-only. Backs the "Provider" panel in the Admin Console (Overview tab).
 * PingAuthorize is the only supported authorization backend.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateRequest, authErrorResponse } from "@/lib/api/validateRequest";
import { getActiveProviderName, getProviderByName } from "@/lib/authorization/providerFactory";
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
    const [pingStatus, policySetsResult, policiesResult] = await Promise.all([
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
      connectivity: { ping: pingStatus },
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

