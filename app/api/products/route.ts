/**
 * GET /api/products
 *
 * Returns products filtered by the user's authorized sales organizations.
 *
 * Authorization flow:
 *   1. Validate session → get user context
 *   2. canAccess(view, products) — RBAC check
 *   3. Determine allowed sales orgs from CRM context (ABAC)
 *   4. Query Supabase with .in('sales_org_id', allowedSalesOrgs)
 *   5. If user lacks view_pricing — mask price field
 *
 * This demonstrates DATA-LEVEL authorization:
 *   The same endpoint returns DIFFERENT data depending on who calls it.
 *   A user with ACC100 gets IA001+BA002 products.
 *   A user with ACC200 gets PA001+EU001 products.
 *   They both hit the same URL — the backend enforces the filter.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateRequest, authErrorResponse } from "@/lib/api/validateRequest";
import { canAccess } from "@/lib/authorization/canAccess";
import { maskProductPricing } from "@/lib/authorization/filterByPermission";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { session, userContext, permitContext } = await validateRequest(req);
    const { user, selectedSalesOrgs } = userContext;

    const canViewProducts = await canAccess(
      session.userId, "view", "products", permitContext, user.role
    );
    if (!canViewProducts) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const canViewPricing = await canAccess(
      session.userId, "view_pricing", "products", permitContext, user.role
    );

    // Build filtered Supabase query
    const supabase = getSupabaseServerClient();

    // Apply sales org filter — data-level authorization
    const salesOrgFilter =
      selectedSalesOrgs.length > 0 ? selectedSalesOrgs : ["__no_access__"];

    const { data: products, error } = await supabase
      .from("products")
      .select(
        "id, name, description, price, sku, sales_org_id, category, image_url, created_at"
      )
      .in("sales_org_id", salesOrgFilter)
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("[GET /api/products] Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }

    // Mask pricing if user lacks view_pricing permission
    const result = maskProductPricing(products ?? [], canViewPricing);

    return NextResponse.json({
      data: result,
      meta: {
        total: result.length,
        allowedSalesOrgs: selectedSalesOrgs,
        pricingVisible: canViewPricing,
      },
    });
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
