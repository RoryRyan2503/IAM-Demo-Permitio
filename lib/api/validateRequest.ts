/**
 * API Request Validation
 *
 * Shared helper used by all Route Handlers to:
 *   1. Extract the session from the httpOnly cookie
 *   2. Resolve the user's CRM context (accounts, salesOrgs)
 *   3. Determine the selected account from the request header
 *
 * Pattern:
 *   Every protected Route Handler calls validateRequest() first.
 *   If it throws, the handler returns 401/403.
 *   If it succeeds, the handler uses the returned context for:
 *     - canAccess() authorization checks
 *     - Supabase query filter construction
 *
 * Header convention:
 *   x-account-id — client sends the currently selected account ID
 *                  (set by the AccountSwitcher component)
 *   x-user-id    — injected by middleware (not trusted from client)
 */

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUserContext, userHasAccountAccess, getLastDataSource } from "@/lib/crm/crmService";
import { createTrace, finalizeTrace, type TraceEntry } from "@/lib/debug/traceStore";
import type { AuthSession, UserContext, PermitContext } from "@/types";

export interface ValidatedRequest {
  session: AuthSession;
  userContext: UserContext;
  /** Pre-built PermitContext — pass directly to canAccess() */
  permitContext: PermitContext;
  /** Debug trace entry — finalize after handler completes */
  trace: TraceEntry;
}

/**
 * Validate an incoming API request.
 *
 * @throws {Error} with statusCode 401 if not authenticated
 * @throws {Error} with statusCode 403 if account access denied
 */
export async function validateRequest(
  req: NextRequest
): Promise<ValidatedRequest> {
  const url = new URL(req.url);
  const reqHeaders: Record<string, string> = {};
  for (const key of ["x-user-id", "x-user-role", "x-account-id", "content-type", "referer"]) {
    const v = req.headers.get(key);
    if (v) reqHeaders[key] = v;
  }
  const query: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { query[k] = v; });

  const trace = createTrace(req.method, req.url, url.pathname, reqHeaders, query);

  // Step 1: Extract session from httpOnly cookie
  const session = await getSession();

  if (!session) {
    trace.status = 401;
    trace.tags.push("no-session");
    finalizeTrace(trace);
    const err = new Error("Unauthorized: no session") as Error & {
      statusCode: number;
    };
    err.statusCode = 401;
    throw err;
  }

  trace.userId = session.userId;
  trace.userRole = session.role;

  // Step 2: Get the client's selected account from request header
  // Middleware injects x-user-id; client sets x-account-id
  const requestedAccountId =
    req.headers.get("x-account-id") ??
    req.nextUrl.searchParams.get("accountId") ??
    undefined;

  if (requestedAccountId) {
    trace.tags.push(`account:${requestedAccountId}`);
  }

  // Step 3: Verify the user actually has access to the requested account
  if (requestedAccountId) {
    const hasAccess = await userHasAccountAccess(session.userId, requestedAccountId);
    if (!hasAccess) {
      trace.status = 403;
      trace.tags.push("account-access-denied");
      finalizeTrace(trace);
      const err = new Error(
        `Forbidden: user ${session.userId} does not have access to account ${requestedAccountId}`
      ) as Error & { statusCode: number };
      err.statusCode = 403;
      throw err;
    }
  }

  // Step 4: Build the full user context from CRM
  const userContext = await getUserContext(
    session.userId,
    session.email,
    requestedAccountId
  );

  trace.tags.push(`data:${getLastDataSource()}`);
  trace.upstreamCalls.push({
    service: "Supabase/CRM",
    method: "GET",
    url: "getUserContext()",
    status: 200,
  });

  // Step 5: Build PermitContext — ready for canAccess() calls
  const permitContext: PermitContext = {
    selectedAccountId: userContext.selectedAccount?.accountId,
    allowedSalesOrgs: userContext.selectedSalesOrgs,
    activeSalesArea: userContext.activeSalesArea ?? undefined,
    persona: userContext.user.persona,
    toolIds: userContext.approvedToolIds,
    isSuperUser: userContext.user.isSuperUser,
  };

  // Auto-finalize trace after 10s if handler doesn't explicitly finalize
  const traceStart = performance.now();
  setTimeout(() => {
    if (!trace.status) {
      trace.status = 200;
      trace.responseTime = Math.round(performance.now() - traceStart);
      trace.tags.push("auto-finalized");
      finalizeTrace(trace);
    }
  }, 10_000);

  return { session, userContext, permitContext, trace };
}

/**
 * Build a standardized error response for auth failures.
 */
export function authErrorResponse(
  error: unknown
): { message: string; status: number } {
  const err = error as Error & { statusCode?: number };
  return {
    message: err.message ?? "Authorization failed",
    status: err.statusCode ?? 500,
  };
}
