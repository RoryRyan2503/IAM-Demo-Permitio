/**
 * GET /api/auth/mock-idp-users
 *
 * Public (pre-login) listing of the local mock-IDP identity directory —
 * used by the Enterprise Login form's username search/select. Returns
 * identity fields only (no password hashes) plus the shared demo password
 * so the login form can pre-fill it without hard-coding the value twice.
 */

import { NextResponse } from "next/server";
import { listMockIdpUsers } from "@/lib/auth/mockIdp";

export async function GET() {
  const users = listMockIdpUsers().map((u) => ({
    username: u.username,
    name: `${u.firstName} ${u.lastName}`,
  }));

  return NextResponse.json({
    users,
    demoPassword: process.env.MOCK_IDP_DEMO_PASSWORD ?? "Honeywell#2026",
  });
}
