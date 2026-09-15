/**
 * GET  /api/admin/policies?policySetId= — list policies (optionally scoped to a policy set)
 * POST /api/admin/policies             — create a policy
 */

import { NextRequest, NextResponse } from "next/server";
import { validateRequest, authErrorResponse } from "@/lib/api/validateRequest";
import { listPolicies, createPolicy } from "@/services/ping-authorize/policies";

export async function GET(req: NextRequest) {
  try {
    const { userContext } = await validateRequest(req);
    if (userContext.user.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    const policySetId = req.nextUrl.searchParams.get("policySetId") ?? undefined;
    const data = await listPolicies(policySetId);
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
    const created = await createPolicy({
      policySetId: body.policySetId,
      name: body.name,
      description: body.description,
      shared: body.shared,
      disabled: body.disabled,
      combiningAlgorithm: body.combiningAlgorithm,
      effect: body.effect,
      conditions: body.conditions,
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
