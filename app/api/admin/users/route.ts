/**
 * GET /api/admin/users — list all users with their role and sold-to account
 * associations, for the Admin Console User Management page.
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
      .from("users")
      .select(
        `id, email, name, role, phone, department, hon_id, user_type,
         user_accounts (
           account_id,
           accounts ( id, account_name )
         )`
      )
      .order("name", { ascending: true });

    if (error) {
      console.error("[GET /api/admin/users] Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    const users = (data ?? []).map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      phone: u.phone,
      department: u.department,
      honId: u.hon_id,
      userType: u.user_type,
      accounts: (u.user_accounts ?? [])
        .map((ua: any) => ua.accounts)
        .filter(Boolean)
        .map((a: any) => ({ id: a.id, accountName: a.account_name })),
    }));

    return NextResponse.json({ data: users, meta: { total: users.length } });
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
