/**
 * GET /api/crm/accounts
 *
 * Returns all accounts the authenticated user is associated with.
 * Used by the AccountSwitcher to populate the account dropdown.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUserAccounts, getLastDataSource } from "@/lib/crm/crmService";
import { createTrace, finalizeTrace } from "@/lib/debug/traceStore";

export async function GET(_req: NextRequest) {
  const start = performance.now();
  const trace = createTrace("GET", _req.url, "/api/crm/accounts", {}, {});

  const session = await getSession();
  if (!session) {
    trace.status = 401; trace.responseTime = Math.round(performance.now() - start);
    finalizeTrace(trace);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  trace.userId = session.userId;
  trace.userRole = session.role;

  const accounts = await getUserAccounts(session.userId);

  trace.status = 200;
  trace.responseTime = Math.round(performance.now() - start);
  trace.tags.push(`data:${getLastDataSource()}`);
  trace.upstreamCalls.push({ service: "Supabase/CRM", method: "GET", url: "getUserAccounts()", status: 200 });
  trace.responseSummary = `${accounts.length} accounts`;
  finalizeTrace(trace);

  return NextResponse.json({ data: accounts });
}
