/**
 * GET /api/products/[id]
 * Returns a single product by ID.
 */
import { NextRequest, NextResponse } from "next/server";
import { validateRequest, authErrorResponse } from "@/lib/api/validateRequest";
import { canAccess } from "@/lib/authorization/canAccess";
import { CoveoApiError } from "@/services/coveo/client";
import { searchCatalogProducts } from "@/services/catalog/productSearch";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, userContext, permitContext } = await validateRequest(req);
    const { user } = userContext;

    const canViewProducts = await canAccess(
      session.userId, "view", "products", permitContext, user.role
    );
    if (!canViewProducts) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const canViewPricing = await canAccess(
      session.userId, "view_pricing", "products", permitContext, user.role
    );

    const result = await searchCatalogProducts({
      session,
      userContext,
      query: params.id,
      userAgent: req.headers.get("user-agent") ?? "",
      referer: req.headers.get("referer") ?? "",
    });
    const product = result.products.find(
      (item) => item.id === params.id || item.sku.toLowerCase() === params.id.toLowerCase()
    );

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (!user.isSuperUser && !userContext.selectedSalesOrgs.includes(product.sales_org_id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!canViewPricing) {
      product.price = null;
    }

    return NextResponse.json({
      data: product,
      meta: { pricingVisible: canViewPricing, sources: result.sources, warnings: result.warnings },
    });
  } catch (error) {
    if (error instanceof CoveoApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
