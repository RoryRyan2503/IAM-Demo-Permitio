/**
 * GET /api/admin/audit-log — recent authorization decisions
 * Admin-only. Surfaces AuthorizationService's audit trail in the Admin Console.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateRequest, authErrorResponse } from "@/lib/api/validateRequest";
import { getRecentDecisions, clearAuditLog } from "@/lib/authorization/auditLog";

export async function GET(req: NextRequest) {
  try {
    const { userContext } = await validateRequest(req);
    if (userContext.user.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? "50");
    return NextResponse.json({ data: getRecentDecisions(limit) });
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userContext } = await validateRequest(req);
    if (userContext.user.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    clearAuditLog();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
