/**
 * GET /api/admin/accounts — list all sold-to accounts (id + name only), used
 * to populate the "add account association" picker in the Admin Console.
 *
 * Authorization: role === "admin" only (role-based, no persona check).
 */

import { NextRequest, NextResponse } from "next/server";
import { validateRequest, authErrorResponse } from "@/lib/api/validateRequest";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { userContext } = await validateRequest(req);
    if (userContext.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: admin role required" }, { status: 403 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("accounts")
      .select("id, account_name")
      .order("account_name", { ascending: true });

    if (error) {
      console.error("[GET /api/admin/accounts] Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
    }

    return NextResponse.json({
      data: (data ?? []).map((a) => ({ id: a.id, accountName: a.account_name })),
    });
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
