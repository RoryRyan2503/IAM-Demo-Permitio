/**
 * GET /api/products
 *
 * Returns products filtered by the user's authorized sales organizations.
 *
 * Authorization flow:
 *   1. Validate session → get user context
 *   2. canAccess(view, products) — RBAC check
 *   3. Determine allowed sales orgs from CRM context (ABAC)
 *   4. Query Coveo using the user's authorized sales-area context
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
import { CoveoApiError } from "@/services/coveo/client";
import { searchCatalogProducts } from "@/services/catalog/productSearch";

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

    const selectedCurrency = req.headers.get("x-selected-currency") ?? "USD";
    if (!/^[A-Za-z]{3}$/.test(selectedCurrency)) {
      return NextResponse.json({ error: "Invalid selected currency" }, { status: 400 });
    }

    const result = await searchCatalogProducts({
      session,
      userContext,
      query: req.nextUrl.searchParams.get("q") ?? "",
      userAgent: req.headers.get("user-agent") ?? "",
      referer: req.headers.get("referer") ?? "",
      selectedCurrency: selectedCurrency.toUpperCase(),
    });
    const products = canViewPricing
      ? result.products
      : result.products.map((product) => ({ ...product, price: null }));

    return NextResponse.json({
      data: products,
      meta: {
        total: result.total,
        allowedSalesOrgs: selectedSalesOrgs,
        pricingVisible: canViewPricing,
        sources: result.sources,
        warnings: result.warnings,
      },
    });
  } catch (error) {
    if (error instanceof CoveoApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
