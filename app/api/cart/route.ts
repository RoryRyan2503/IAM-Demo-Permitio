/**
 * Browser-local demo cart, signed and scoped to user + selected account.
 * Product details and prices are always resolved server-side through Coveo.
 */
import { NextRequest, NextResponse } from "next/server";
import { validateRequest, authErrorResponse, type ValidatedRequest } from "@/lib/api/validateRequest";
import { canAccess } from "@/lib/authorization/canAccess";
import { searchCatalogProducts } from "@/services/catalog/productSearch";
import {
  CART_COOKIE_NAME, CartError, cartCookieOptions, readCart, writeCart, type CartLine,
} from "@/lib/cart/cookie";

export const maxDuration = 60;

async function authorize(req: NextRequest, action: "view" | "create") {
  const context = await validateRequest(req);
  const { session, userContext, permitContext } = context;
  if (!userContext.selectedAccount) throw new CartError("No account selected", 400);
  if (!await canAccess(session.userId, action, "cart", permitContext, userContext.user.role)) {
    throw new CartError("Forbidden", 403);
  }
  return { ...context, accountId: userContext.selectedAccount.accountId };
}

async function requireProducts(context: ValidatedRequest) {
  const { session, userContext, permitContext } = context;
  if (!await canAccess(session.userId, "view", "products", permitContext, userContext.user.role)) {
    throw new CartError("Forbidden", 403);
  }
}

function currency(req: NextRequest): string {
  const value = req.headers.get("x-selected-currency") ?? "USD";
  if (!/^[A-Za-z]{3}$/.test(value)) throw new CartError("Invalid selected currency", 400);
  return value.toUpperCase();
}

async function resolveProduct(req: NextRequest, context: ValidatedRequest, identifier: string) {
  const result = await searchCatalogProducts({
    session: context.session,
    userContext: context.userContext,
    query: identifier,
    userAgent: req.headers.get("user-agent") ?? "",
    referer: req.headers.get("referer") ?? "",
    selectedCurrency: currency(req),
  });
  const product = result.products.find((item) =>
    item.id === identifier || item.sku.toLowerCase() === identifier.toLowerCase()
  );
  if (!product) throw new CartError(`Cart product ${identifier} is unavailable for this account.`, 404);
  if (!context.userContext.user.isSuperUser
      && !context.userContext.selectedSalesOrgs.includes(product.sales_org_id)) {
    throw new CartError("Forbidden", 403);
  }
  return product;
}

function savedCart(req: NextRequest, userId: string) {
  return readCart(req.cookies.get(CART_COOKIE_NAME)?.value, userId);
}

function saveCart(items: CartLine[], userId: string, status = 200) {
  const value = writeCart(items, userId);
  const response = NextResponse.json({ status: "saved" }, { status, headers: { "Cache-Control": "no-store" } });
  response.cookies.set(CART_COOKIE_NAME, value, cartCookieOptions);
  return response;
}

function cartError(error: unknown) {
  const { message, status } = authErrorResponse(error);
  console.error("[Cart] Request failed:", { status, message });
  const response = NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  if (error instanceof CartError && error.clearCookie) {
    response.cookies.set(CART_COOKIE_NAME, "", { ...cartCookieOptions, maxAge: 0 });
  }
  return response;
}

export async function GET(req: NextRequest) {
  try {
    const context = await authorize(req, "view");
    const accountId = context.accountId;
    const lines = savedCart(req, context.session.userId).filter((line) => line.accountId === accountId);
    const selectedCurrency = currency(req);
    if (lines.length === 0) {
      return NextResponse.json({ data: [], meta: { total: 0, itemCount: 0, currency: selectedCurrency } },
        { headers: { "Cache-Control": "no-store" } });
    }
    await requireProducts(context);
    const pricingVisible = await canAccess(
      context.session.userId, "view_pricing", "products", context.permitContext, context.userContext.user.role
    );
    const data = await Promise.all(lines.map(async (line) => {
      const product = await resolveProduct(req, context, line.sku);
      return {
        id: product.sku,
        product_id: product.sku,
        quantity: line.quantity,
        products: { ...product, price: pricingVisible ? product.price : null },
      };
    }));
    if (data.some((item) => item.products.price !== null
        && item.products.currency.toUpperCase() !== selectedCurrency)) {
      throw new CartError("Catalog pricing does not match the selected currency. Select the matching currency or retry.", 502);
    }
    const total = data.reduce<number | null>((sum, item) =>
      sum === null || item.products.price === null ? null : sum + item.products.price * item.quantity, 0);
    return NextResponse.json({ data, meta: { total, itemCount: data.length, pricingVisible, currency: selectedCurrency } },
      { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return cartError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await authorize(req, "create");
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new CartError("Invalid request body", 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new CartError("Invalid request body", 400);
    const { productId, sku, quantity = 1 } = body as Record<string, unknown>;
    const identifier = sku ?? productId;
    if (typeof identifier !== "string" || !identifier.trim() || identifier.length > 128) {
      throw new CartError("A valid productId or sku is required", 400);
    }
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      throw new CartError("Quantity must be a whole number from 1 to 999", 400);
    }
    const items = savedCart(req, context.session.userId);
    await requireProducts(context);
    const product = await resolveProduct(req, context, identifier);
    const accountId = context.accountId;
    const existing = items.find((line) => line.accountId === accountId && line.sku === product.sku);
    if (existing) {
      existing.quantity = quantity;
    } else {
      items.unshift({ accountId, sku: product.sku, quantity });
    }
    return saveCart(items, context.session.userId, 201);
  } catch (error) {
    return cartError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const context = await authorize(req, "create");
    const accountId = context.accountId;
    const productId = req.nextUrl.searchParams.get("productId");
    const clear = req.nextUrl.searchParams.get("clear") === "true";
    if (!clear && !productId) throw new CartError("productId query param is required", 400);
    const items = savedCart(req, context.session.userId).filter((line) =>
      line.accountId !== accountId || (!clear && line.sku !== productId)
    );
    return saveCart(items, context.session.userId);
  } catch (error) {
    return cartError(error);
  }
}
