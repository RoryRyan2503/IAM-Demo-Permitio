/**
 * GET  /api/debug/traces      — return recent traces as JSON
 * DELETE /api/debug/traces     — clear all traces
 *
 * Admin-only. No sidebar link — access directly via /debug.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getTraces, clearTraces } from "@/lib/debug/traceStore";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return null;
  }
  return session;
}

export async function GET(_req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  return NextResponse.json({ traces: getTraces(200) });
}

export async function DELETE(_req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  clearTraces();
  return NextResponse.json({ ok: true });
}
