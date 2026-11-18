/**
 * GET /api/auth/mock-idp-users
 *
 * Public (pre-login) listing of identity fields from DynamoDB's users table.
 * Credentials are never returned by this endpoint.
 */

import { NextResponse } from "next/server";
import { listMockIdpUsers } from "@/lib/auth/mockIdp";

export async function GET() {
  try {
    const users = await listMockIdpUsers();
    return NextResponse.json({
      users: users.map((user) => ({
        userId: user.userId,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.userId,
        email: user.email,
        honId: user.honId,
      })),
    });
  } catch (error) {
    console.error("[mock-idp-users] DynamoDB directory lookup failed:", error);
    const status = (error as { statusCode?: number }).statusCode ?? 503;
    return NextResponse.json({ error: "Unable to load users from DynamoDB." }, { status });
  }
}
