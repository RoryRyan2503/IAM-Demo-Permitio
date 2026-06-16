/**
 * GET /api/crm/user-context/[userId]
 *
 * Returns the full CRM context for a user:
 *   - User profile (name, role, persona)
 *   - Associated accounts (sold-to accounts)
 *   - Sales organizations per account
 *   - Current permissions context
 *
 * This simulates an enterprise CRM/SFDC API endpoint.
 * In production, this would call real CRM systems.
 *
 * Special value: userId = "me" resolves to the authenticated user.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUserContext, getLastDataSource } from "@/lib/crm/crmService";
import { createTrace, finalizeTrace } from "@/lib/debug/traceStore";

interface RouteParams {
  params: { userId: string };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const start = performance.now();
  const url = new URL(req.url);
  const trace = createTrace("GET", req.url, url.pathname, {}, Object.fromEntries(url.searchParams));

  const session = await getSession();
  if (!session) {
    trace.status = 401; trace.responseTime = Math.round(performance.now() - start);
    finalizeTrace(trace);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  trace.userId = session.userId;
  trace.userRole = session.role;

  // Resolve "me" to the authenticated user's ID
  const targetUserId =
    params.userId === "me" ? session.userId : params.userId;

  // Security: non-admin users can only fetch their own context
  if (targetUserId !== session.userId && session.role !== "admin") {
    trace.status = 403; trace.responseTime = Math.round(performance.now() - start);
    finalizeTrace(trace);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const selectedAccountId =
    req.nextUrl.searchParams.get("accountId") ?? undefined;

  const userContext = await getUserContext(
    targetUserId,
    session.email,
    selectedAccountId
  );

  trace.status = 200;
  trace.responseTime = Math.round(performance.now() - start);
  trace.tags.push(`data:${getLastDataSource()}`);
  trace.upstreamCalls.push({ service: "Supabase/CRM", method: "GET", url: "getUserContext()", status: 200 });
  finalizeTrace(trace);

  return NextResponse.json(userContext);
}
