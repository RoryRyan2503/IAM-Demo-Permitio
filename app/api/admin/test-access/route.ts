/**
 * POST /api/admin/test-access — Decision Testing Console backend
 *
 * Runs an authorization check against BOTH providers (Permit.io and
 * PingAuthorize) for a manually specified subject/resource/action/context and
 * returns a side-by-side comparison. Used exclusively by /admin/test-access.
 *
 * This intentionally calls checkAccessDetailed() twice with an explicit
 * providerName so it can compare engines regardless of which one is
 * currently "active" — the one case where bypassing the single active
 * provider is appropriate, since comparison IS the feature.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateRequest, authErrorResponse } from "@/lib/api/validateRequest";
import { checkAccessDetailed } from "@/lib/authorization/AuthorizationService";
import type { PermitContext, UserRole } from "@/types";

interface TestAccessRequestBody {
  userId: string;
  role: UserRole;
  persona?: string;
  isSuperUser?: boolean;
  allowedSalesOrgs?: string[];
  selectedAccountId?: string;
  toolIds?: string[];
  resource: string;
  action: string;
}

export async function POST(req: NextRequest) {
  try {
    const { userContext } = await validateRequest(req);
    if (userContext.user.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const body = (await req.json()) as TestAccessRequestBody;
    if (!body?.userId || !body?.role || !body?.resource || !body?.action) {
      return NextResponse.json({ error: "userId, role, resource, and action are required" }, { status: 400 });
    }

    const context: PermitContext = {
      persona: body.persona,
      isSuperUser: body.isSuperUser,
      allowedSalesOrgs: body.allowedSalesOrgs ?? [],
      selectedAccountId: body.selectedAccountId,
      toolIds: body.toolIds ?? [],
    };

    const [permitResult, pingResult] = await Promise.all([
      checkAccessDetailed(body.userId, body.action, body.resource, context, body.role, "permit"),
      checkAccessDetailed(body.userId, body.action, body.resource, context, body.role, "ping"),
    ]);

    return NextResponse.json({
      request: { userId: body.userId, role: body.role, resource: body.resource, action: body.action, context },
      results: [
        { provider: "Permit.io", ...permitResult },
        { provider: "PingAuthorize", ...pingResult },
      ],
      agree: permitResult.allowed === pingResult.allowed,
    });
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
