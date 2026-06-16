/**
 * GET  /api/orders       — list orders for the selected account
 * POST /api/orders       — create a new order (buyer role only)
 *
 * Authorization:
 *   - GET:  role >= viewer, scoped to selectedAccount
 *   - POST: role >= buyer + canAccess(create, orders)
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

    const canViewOrders = await canAccess(
      session.userId, "view", "orders", permitContext, user.role
    );
    if (!canViewOrders) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("orders")
      .select(
        `id, account_id, user_id, status, total, created_at,
         order_items (
           id, product_id, product_name, quantity, unit_price
         )`
      )
      .eq("account_id", selectedAccount.accountId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/orders] Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [], meta: { total: data?.length ?? 0 } });
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

    const canCreateOrders = await canAccess(
      session.userId, "create", "orders", permitContext, user.role
    );
    if (!canCreateOrders) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { items } = body as { items: Array<{ productId: string; quantity: number; unitPrice: number; productName: string }> };

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Order must have at least one item" }, { status: 400 });
    }

    const total = items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    const supabase = getSupabaseServerClient();

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        account_id: selectedAccount.accountId,
        user_id: session.userId,
        status: "pending",
        total,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("[POST /api/orders] Create order error:", orderError);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    // Insert order items
    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("[POST /api/orders] Insert items error:", itemsError);
      return NextResponse.json({ error: "Failed to create order items" }, { status: 500 });
    }

    return NextResponse.json({ data: { orderId: order.id }, status: "created" }, { status: 201 });
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
