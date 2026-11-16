/**
 * GET /api/my-accounts
 *
 * Returns the authenticated user's Sold-To accounts (+ sales-org/tool
 * attributes needed by the existing account-switcher UI).
 *
 * The user ID is derived from the server-side session cookie (set at login
 * from the verified JWT `sub`) — never accepted from the client. For the
 * 50 local-mock-IDP users, the session's JWT is re-verified here as a
 * defense-in-depth check before trusting its `sub`.
 *
 * Data source is resolved transparently by getUserContext():
 *   - Miguel/Sarah/Carlos (legacy demo users) → Supabase / mockData
 *   - The 50 local-mock-IDP users             → DynamoDB
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { verifyMockIdpJwt } from "@/lib/auth/mockIdpJwt";
import { isDynamoIdpUser } from "@/lib/auth/dynamoUsers";
import { getUserContext, getLastDataSource } from "@/lib/crm/crmService";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let userId = session.userId;

  // Defense-in-depth: for mock-IDP users, re-verify the signed JWT stored in
  // the session and use ITS `sub` rather than trusting the cookie field alone.
  if (isDynamoIdpUser(session.userId)) {
    const claims = await verifyMockIdpJwt(session.accessToken);
    if (!claims?.sub) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }
    userId = claims.sub;
  }

  const selectedAccountId = req.nextUrl.searchParams.get("accountId") ?? undefined;
  const userContext = await getUserContext(userId, session.email, selectedAccountId);

  return NextResponse.json({
    accounts: userContext.user.accounts,
    selectedAccount: userContext.selectedAccount,
    selectedSalesOrgs: userContext.selectedSalesOrgs,
    activeSalesArea: userContext.activeSalesArea,
    approvedToolIds: userContext.approvedToolIds,
    dataSource: getLastDataSource(),
  });
}
