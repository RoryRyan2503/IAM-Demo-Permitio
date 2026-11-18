/**
 * GET /api/auth/permissions
 *
 * Returns a permission map for the current user + account context.
 * Used by the frontend to drive UX-level show/hide decisions.
 *
 * IMPORTANT: These are UX permissions only.
 * Every API endpoint enforces authorization independently via canAccess().
 * Frontend permission checks are purely for rendering — not security.
 *
 * Response format:
 *   { "view:products": true, "create:quotes": false, ... }
 */

import { NextRequest, NextResponse } from "next/server";
import { validateRequest, authErrorResponse } from "@/lib/api/validateRequest";
import { checkAccessDetailed } from "@/lib/authorization/AuthorizationService";
import { getLastDataSource } from "@/lib/crm/crmService";
import { finalizeTrace, type TraceEntry } from "@/lib/debug/traceStore";
import type { PermissionAction, PermissionMap, PermissionResource } from "@/types";

export const maxDuration = 30;

const PERMISSION_CHECKS = [
  ["view", "products"],
  ["view_pricing", "products"],
  ["view", "orders"],
  ["create", "orders"],
  ["view", "quotes"],
  ["create", "quotes"],
  ["view", "cart"],
  ["create", "cart"],
  ["view", "admin_dashboard"],
  ["manage", "users"],
] as const satisfies readonly (readonly [PermissionAction, PermissionResource])[];

export async function GET(req: NextRequest) {
  let requestTrace: TraceEntry | undefined;
  try {
    const { session, userContext, permitContext, trace } = await validateRequest(req);
    requestTrace = trace;
    const { user } = userContext;

    const decisions = await Promise.all(PERMISSION_CHECKS.map(([action, resource]) =>
      checkAccessDetailed(session.userId, action, resource, permitContext, user.role)
    ));

    const engines = new Set(decisions.map((decision) => decision.engine));
    const authEngine = engines.size === 1 ? decisions[0].engine : "mixed";
    trace.tags.push(`auth:${authEngine}`);
    const permissions: PermissionMap = {};
    PERMISSION_CHECKS.forEach(([action, resource], index) => {
      permissions[`${action}:${resource}`] = decisions[index].allowed;
    });

    trace.status = 200;
    trace.responseTime = Math.round(performance.now() - trace.timestamp);
    trace.responseSummary = JSON.stringify({ permissions, authEngine }).substring(0, 500);
    finalizeTrace(trace);

    return NextResponse.json({
      permissions,
      authEngine,
      dataSource: getLastDataSource(),
      user: {
        id: user.id,
        honId: user.honId,
        contactId: user.contactId,
        name: user.name,
        email: user.email,
        role: user.role,
        persona: user.persona,
        userType: user.userType,
        isSuperUser: user.isSuperUser,
      },
      selectedAccount: userContext.selectedAccount,
      activeSalesArea: userContext.activeSalesArea,
      toolAccess: user.toolAccess,
      approvedToolIds: userContext.approvedToolIds,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    if (requestTrace) {
      requestTrace.status = status;
      requestTrace.responseSummary = message;
      finalizeTrace(requestTrace);
    }
    return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
