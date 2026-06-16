/**
 * GET  /api/quotes  — list quotes for selected account
 * POST /api/quotes  — create a new quote (procurement persona only)
 *
 * This demonstrates ATTRIBUTE-BASED access control:
 *   - All buyers can view quotes
 *   - Only buyers with PROCUREMENT persona can CREATE quotes
 *   - Viewers have no quote access
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

    const canViewQuotes = await canAccess(
      session.userId, "view", "quotes", permitContext, user.role
    );
    if (!canViewQuotes) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("quotes")
      .select(
        `id, account_id, user_id, status, total, valid_until, created_at,
         quote_items (
           id, product_id, product_name, quantity, unit_price, discount_pct
         )`
      )
      .eq("account_id", selectedAccount.accountId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/quotes] Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch quotes" }, { status: 500 });
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

    // ABAC: only the PROCUREMENT persona (or an admin) with the quote tool (TL009)
    // may create quotes. This is enforced here in code because custom Permit
    // ABAC user-sets do not reliably evaluate on the shared cloud PDP — the
    // Permit policy (quote_creation user-set → quotes:create) documents the same
    // intent. Mirrors lib/authorization/canAccess.ts toolBasedRebac quotes:create.
    const isAdmin = user.role === "admin" || user.isSuperUser;
    const hasQuoteTool = userContext.approvedToolIds?.includes("TL009") ?? false;
    const canCreateQuotes = hasQuoteTool && (isAdmin || user.persona === "procurement");

    if (!canCreateQuotes) {
      return NextResponse.json(
        { error: "Forbidden: quote creation requires the procurement persona" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { items, validUntil } = body as {
      items: Array<{
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        discountPct?: number;
      }>;
      validUntil?: string;
    };

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Quote must have at least one item" }, { status: 400 });
    }

    const total = items.reduce(
      (sum, item) =>
        sum +
        item.unitPrice *
          item.quantity *
          (1 - (item.discountPct ?? 0) / 100),
      0
    );

    const supabase = getSupabaseServerClient();

    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .insert({
        account_id: selectedAccount.accountId,
        user_id: session.userId,
        status: "draft",
        total: Math.round(total),
        valid_until: validUntil ?? null,
      })
      .select("id")
      .single();

    if (quoteError || !quote) {
      console.error("[POST /api/quotes] Create quote error:", quoteError);
      return NextResponse.json({ error: "Failed to create quote" }, { status: 500 });
    }

    const quoteItems = items.map((item) => ({
      quote_id: quote.id,
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      discount_pct: item.discountPct ?? 0,
    }));

    const { error: itemsError } = await supabase
      .from("quote_items")
      .insert(quoteItems);

    if (itemsError) {
      console.error("[POST /api/quotes] Insert items error:", itemsError);
      return NextResponse.json({ error: "Failed to create quote items" }, { status: 500 });
    }

    return NextResponse.json(
      { data: { quoteId: quote.id }, status: "created" },
      { status: 201 }
    );
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
