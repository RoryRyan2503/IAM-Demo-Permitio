/**
 * POST   /api/admin/users/[id]/accounts — add a sold-to account association
 * DELETE /api/admin/users/[id]/accounts?accountId=... — remove an association
 *
 * Authorization: role === "admin" only (role-based, no persona check).
 * Duplicate protection: the user_accounts table has PRIMARY KEY
 * (user_id, account_id), so a duplicate insert is rejected at the database
 * level; we detect that unique-violation and return a friendly 409.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateRequest, authErrorResponse } from "@/lib/api/validateRequest";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userContext } = await validateRequest(req);
    if (userContext.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: admin role required" }, { status: 403 });
    }

    const body = await req.json();
    const { accountId } = body as { accountId?: string };
    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id, account_name")
      .eq("id", accountId)
      .maybeSingle();
    if (accountError || !account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("user_accounts")
      .insert({ user_id: params.id, account_id: accountId });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "User is already associated with this account" },
          { status: 409 }
        );
      }
      console.error("[POST /api/admin/users/[id]/accounts] Supabase error:", error);
      return NextResponse.json({ error: "Failed to add account association" }, { status: 500 });
    }

    return NextResponse.json(
      { data: { userId: params.id, accountId, accountName: account.account_name } },
      { status: 201 }
    );
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userContext } = await validateRequest(req);
    if (userContext.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: admin role required" }, { status: 403 });
    }

    const accountId = req.nextUrl.searchParams.get("accountId");
    if (!accountId) {
      return NextResponse.json({ error: "accountId query param is required" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from("user_accounts")
      .delete()
      .eq("user_id", params.id)
      .eq("account_id", accountId);

    if (error) {
      console.error("[DELETE /api/admin/users/[id]/accounts] Supabase error:", error);
      return NextResponse.json({ error: "Failed to remove account association" }, { status: 500 });
    }

    return NextResponse.json({ data: { userId: params.id, accountId } });
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
