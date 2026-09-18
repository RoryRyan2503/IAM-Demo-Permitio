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
import { canAccess, getLastAuthEngine } from "@/lib/authorization/canAccess";
import { getLastDataSource } from "@/lib/crm/crmService";
import { finalizeTrace } from "@/lib/debug/traceStore";
import type { PermissionMap } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const { session, userContext, permitContext, trace } = await validateRequest(req);
    const { user } = userContext;

    // Check all relevant permissions in parallel
    const [
      viewProducts,
      viewPricing,
      viewOrders,
      createOrders,
      viewQuotes,
      createQuotes,
      viewCart,
      manageCart,
      viewAdminDashboard,
      manageUsers,
    ] = await Promise.all([
      canAccess(session.userId, "view",         "products",        permitContext, user.role),
      canAccess(session.userId, "view_pricing",  "products",        permitContext, user.role),
      canAccess(session.userId, "view",         "orders",          permitContext, user.role),
      canAccess(session.userId, "create",       "orders",          permitContext, user.role),
      canAccess(session.userId, "view",         "quotes",          permitContext, user.role),
      canAccess(session.userId, "create",       "quotes",          permitContext, user.role),
      canAccess(session.userId, "view",         "cart",            permitContext, user.role),
      canAccess(session.userId, "create",       "cart",            permitContext, user.role),
      canAccess(session.userId, "view",         "admin_dashboard", permitContext, user.role),
      canAccess(session.userId, "manage",       "users",           permitContext, user.role),
    ]);

    const authEngine = getLastAuthEngine();
    trace.tags.push(`auth:${authEngine}`);
    trace.upstreamCalls.push({
      service: "PingAuthorize",
      method: "POST",
      url: "permit.check() ×10",
      status: 200,
    });

    const permissions: PermissionMap = {
      "view:products": viewProducts,
      "view_pricing:products": viewPricing,
      "view:orders": viewOrders,
      "create:orders": createOrders,
      "view:quotes": viewQuotes,
      "create:quotes": createQuotes,
      "view:cart": viewCart,
      "create:cart": manageCart,
      "view:admin_dashboard": viewAdminDashboard,
      "manage:users": manageUsers,
    };

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
    });
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
