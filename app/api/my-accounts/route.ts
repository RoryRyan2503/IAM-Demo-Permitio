/**
 * GET /api/my-accounts
 *
 * Returns the authenticated user's Sold-To accounts (+ sales-org/tool
 * attributes needed by the existing account-switcher UI).
 *
 * The user ID is derived from the server-side session cookie (set at login
 * from the verified JWT `sub`) — never accepted from the client. DynamoDB
 * mock-IDP JWTs are verified centrally by getSession().
 *
 * Data source is resolved transparently by getUserContext():
 *   - Miguel/Sarah/Carlos (legacy demo users) → Supabase / mockData
 *   - Enterprise mock-IDP users               → DynamoDB
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUserContext, getLastDataSource } from "@/lib/crm/crmService";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const selectedAccountId = req.nextUrl.searchParams.get("accountId") ?? undefined;
  const userContext = await getUserContext(
    session.userId,
    session.email,
    selectedAccountId,
    session.identitySource
  );

  return NextResponse.json({
    accounts: userContext.user.accounts,
    selectedAccount: userContext.selectedAccount,
    selectedSalesOrgs: userContext.selectedSalesOrgs,
    activeSalesArea: userContext.activeSalesArea,
    approvedToolIds: userContext.approvedToolIds,
    dataSource: getLastDataSource(),
  });
}
