/**
 * GET /api/dashboard/orders — list recent orders across ALL user accounts
 *
 * Unlike /api/orders (which is scoped to selectedAccount),
 * this returns orders from every account the user has access to.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUserContext, getLastDataSource } from "@/lib/crm/crmService";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createTrace, finalizeTrace } from "@/lib/debug/traceStore";

export async function GET(req: NextRequest) {
  const start = performance.now();
  const url = new URL(req.url);
  const trace = createTrace("GET", req.url, url.pathname, {}, {});

  const session = await getSession();
  if (!session) {
    trace.status = 401;
    trace.responseTime = Math.round(performance.now() - start);
    finalizeTrace(trace);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  trace.userId = session.userId;
  trace.userRole = session.role;

  const userContext = await getUserContext(session.userId, session.email);
  const accountIds = userContext.user.accounts.map((a) => a.accountId);

  if (accountIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `id, account_id, user_id, status, total, created_at,
       order_items (
         id, product_id, product_name, quantity, unit_price
       )`
    )
    .in("account_id", accountIds)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[GET /api/dashboard/orders] Supabase error:", error);
    trace.status = 500;
    trace.responseTime = Math.round(performance.now() - start);
    trace.tags.push("supabase-error");
    finalizeTrace(trace);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }

  trace.status = 200;
  trace.responseTime = Math.round(performance.now() - start);
  trace.tags.push(`data:${getLastDataSource()}`);
  trace.upstreamCalls.push(
    { service: "Supabase/CRM", method: "GET", url: "getUserContext()", status: 200 },
    { service: "Supabase", method: "GET", url: "orders + order_items", status: 200 }
  );
  trace.responseSummary = `${(data ?? []).length} orders`;
  finalizeTrace(trace);

  return NextResponse.json({ data: data ?? [] });
}
