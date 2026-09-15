/**
 * GET  /api/admin/policy-sets — list policy sets
 * POST /api/admin/policy-sets — create a policy set
 *
 * Admin-only. Thin HTTP layer over services/ping-authorize/policySets.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateRequest, authErrorResponse } from "@/lib/api/validateRequest";
import { listPolicySets, createPolicySet } from "@/services/ping-authorize/policySets";

export async function GET(req: NextRequest) {
  try {
    const { userContext } = await validateRequest(req);
    if (userContext.user.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    const data = await listPolicySets();
    return NextResponse.json({ data });
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userContext } = await validateRequest(req);
    if (userContext.user.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    const body = await req.json();
    if (!body?.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const created = await createPolicySet({
      name: body.name,
      description: body.description,
      shared: body.shared,
      disabled: body.disabled,
      combiningAlgorithm: body.combiningAlgorithm,
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
