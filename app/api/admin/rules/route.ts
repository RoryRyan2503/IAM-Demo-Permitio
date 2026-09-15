/**
 * GET  /api/admin/rules?policyId= — list rules (all, or wired into a given Policy's `children`)
 * POST /api/admin/rules            — create a rule, optionally wiring it into a parent Policy
 *
 * Admin-only. Thin HTTP layer over services/ping-authorize/rules.ts. Real
 * PingAuthorize mode only — there is no demo-mode Rule store (see rules.ts).
 */

import { NextRequest, NextResponse } from "next/server";
import { validateRequest, authErrorResponse } from "@/lib/api/validateRequest";
import { listRules, createRule } from "@/services/ping-authorize/rules";
import { getPolicy } from "@/services/ping-authorize/policies";
import type { EntityRef, PingPolicy } from "@/services/ping-authorize/types";

export async function GET(req: NextRequest) {
  try {
    const { userContext } = await validateRequest(req);
    if (userContext.user.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    const policyId = req.nextUrl.searchParams.get("policyId") ?? undefined;

    if (policyId) {
      // Rules "within" a policy = the policy's `children` of type Rule.
      const parent = (await getPolicy(policyId)) as PingPolicy | undefined;
      const refs = ((parent?.children ?? []) as EntityRef[]).filter((c) => c.type === "Rule");
      const all = await listRules();
      const byId = new Map(all.map((r) => [r.id, r]));
      const data = refs.map((ref) => byId.get(ref.id)).filter(Boolean);
      return NextResponse.json({ data });
    }

    const data = await listRules();
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
    if (!body?.name || !body?.effectSettings?.type) {
      return NextResponse.json({ error: "name and effectSettings.type are required" }, { status: 400 });
    }
    const created = await createRule({
      policyId: body.policyId,
      name: body.name,
      description: body.description,
      shared: body.shared,
      disabled: body.disabled,
      effectSettings: body.effectSettings,
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
