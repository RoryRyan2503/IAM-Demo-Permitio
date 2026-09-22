/**
 * PATCH /api/admin/users/[id] — update a user's role.
 *
 * Authorization: role === "admin" only (role-based, no persona check).
 * Role-based-only per requirement: this endpoint never reads or checks
 * `persona` for authorization decisions.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateRequest, authErrorResponse } from "@/lib/api/validateRequest";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

const VALID_ROLES: UserRole[] = ["admin", "buyer", "viewer"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userContext } = await validateRequest(req);
    if (userContext.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: admin role required" }, { status: 403 });
    }

    const body = await req.json();
    const { role } = body as { role?: string };

    if (!role || !VALID_ROLES.includes(role as UserRole)) {
      return NextResponse.json(
        { error: `role must be one of: ${VALID_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("users")
      .update({ role })
      .eq("id", params.id)
      .select("id, role")
      .single();

    if (error || !data) {
      console.error("[PATCH /api/admin/users/[id]] Supabase error:", error);
      return NextResponse.json({ error: "Failed to update user role" }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
