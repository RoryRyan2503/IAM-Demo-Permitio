/**
 * GET    /api/cart  — get cart items for current user + account
 * POST   /api/cart  — add item to cart
 * DELETE /api/cart  — remove item from cart (pass productId as query param)
 *
 * Cart is scoped to the user AND the selected account.
 * Switching accounts shows a different cart.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateRequest, authErrorResponse } from "@/lib/api/validateRequest";
import { canAccess } from "@/lib/authorization/canAccess";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { session, userContext, permitContext } = await validateRequest(req);
    const { user, selectedAccount } = userContext;

    if (!selectedAccount) {
      return NextResponse.json({ error: "No account selected" }, { status: 400 });
    }

    const canViewCart = await canAccess(
      session.userId, "view", "cart", permitContext, user.role
    );
    if (!canViewCart) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("cart_items")
      .select(
        `id, product_id, quantity, added_at,
         products ( id, name, price, sku, sales_org_id, category )`
      )
      .eq("user_id", session.userId)
      .eq("account_id", selectedAccount.accountId)
      .order("added_at", { ascending: false });

    if (error) {
      console.error("[GET /api/cart] Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch cart" }, { status: 500 });
    }

    const total = (data ?? []).reduce((sum, item) => {
      const prod = (item.products as unknown) as { price: number } | null;
      const price = prod?.price ?? 0;
      return sum + price * item.quantity;
    }, 0);

    return NextResponse.json({
      data: data ?? [],
      meta: { total, itemCount: data?.length ?? 0 },
    });
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, userContext, permitContext } = await validateRequest(req);
    const { user, selectedAccount } = userContext;

    if (!selectedAccount) {
      return NextResponse.json({ error: "No account selected" }, { status: 400 });
    }

    const canManageCart = await canAccess(
      session.userId, "create", "cart", permitContext, user.role
    );
    if (!canManageCart) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { productId, quantity = 1 } = body as {
      productId: string;
      quantity?: number;
    };

    if (!productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Look up the product to get denormalized fields for cart_items
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("name, price, sku")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Upsert: if the item already exists, update quantity
    const { data, error } = await supabase
      .from("cart_items")
      .upsert(
        {
          user_id: session.userId,
          account_id: selectedAccount.accountId,
          product_id: productId,
          product_name: product.name,
          product_sku: product.sku,
          unit_price: product.price,
          quantity,
        },
        { onConflict: "user_id,account_id,product_id" }
      )
      .select("id")
      .single();

    if (error) {
      console.error("[POST /api/cart] Upsert error:", error);
      return NextResponse.json({ error: "Failed to add item to cart" }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { session, userContext, permitContext } = await validateRequest(req);
    const { user, selectedAccount } = userContext;

    if (!selectedAccount) {
      return NextResponse.json({ error: "No account selected" }, { status: 400 });
    }

    const canManageCart = await canAccess(
      session.userId, "create", "cart", permitContext, user.role
    );
    if (!canManageCart) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const productId = req.nextUrl.searchParams.get("productId");
    if (!productId) {
      return NextResponse.json({ error: "productId query param is required" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", session.userId)
      .eq("account_id", selectedAccount.accountId)
      .eq("product_id", productId);

    if (error) {
      console.error("[DELETE /api/cart] Error:", error);
      return NextResponse.json({ error: "Failed to remove item" }, { status: 500 });
    }

    return NextResponse.json({ status: "deleted" });
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
