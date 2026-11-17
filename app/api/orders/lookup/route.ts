import { NextRequest, NextResponse } from "next/server";
import { validateRequest, authErrorResponse } from "@/lib/api/validateRequest";
import { canAccess } from "@/lib/authorization/canAccess";
import { CoveoApiError, fetchCoveoOrderDetails } from "@/services/coveo/client";

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

    const orderNumber = req.nextUrl.searchParams.get("orderNumber")?.trim();
    if (!orderNumber) {
      return NextResponse.json({ error: "Enter an order number to retrieve its details." }, { status: 400 });
    }
    if (orderNumber.length > 40) {
      return NextResponse.json({ error: "Order number is too long." }, { status: 400 });
    }

    const data = await fetchCoveoOrderDetails({ session, userContext, orderNumber });
    return NextResponse.json({ data, meta: { source: "coveo" } });
  } catch (error) {
    if (error instanceof CoveoApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}