/**
 * GET /api/products/[id]
 * Returns a single product by ID.
 */
import { NextRequest, NextResponse } from "next/server";
import { validateRequest, authErrorResponse } from "@/lib/api/validateRequest";
import { canAccess } from "@/lib/authorization/canAccess";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const supabase = getSupabaseServerClient();
    const { data: product, error } = await supabase
      .from("products")
      .select("id, name, description, price, sku, sales_org_id, category, image_url, created_at")
      .eq("id", params.id)
      .single();

    if (error || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Per-record sales-org enforcement (data-level authorization).
    // RBAC (canAccess "view") only confirms the user may view products in general;
    // it CANNOT scope by this specific product's org because the role grant is
    // unconditional (collection-level). So we enforce the org membership here,
    // mirroring the Supabase .in("sales_org_id", ...) filter used by the list route.
    // Super users bypass the org scope (they see all orgs).
    if (!user.isSuperUser && !selectedSalesOrgs.includes(product.sales_org_id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Mask pricing if user lacks permission
    if (!canViewPricing) {
      product.price = 0;
    }

    return NextResponse.json({
      data: product,
      meta: { pricingVisible: canViewPricing },
    });
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
