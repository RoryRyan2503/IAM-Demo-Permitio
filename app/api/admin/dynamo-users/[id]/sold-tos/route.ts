import { NextRequest, NextResponse } from "next/server";
import { validateRequest, authErrorResponse } from "@/lib/api/validateRequest";
import { isDynamoConfigured } from "@/lib/db/dynamoClient";
import { addDynamoSoldTo, removeDynamoSoldTo } from "@/lib/crm/dynamoAdminUsers";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userContext } = await validateRequest(req);
    if (userContext.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!isDynamoConfigured()) return NextResponse.json({ error: "DynamoDB is not configured" }, { status: 503 });
    const body = await req.json();
    if (typeof body.soldToId !== "string" || !body.soldToId.trim()) return NextResponse.json({ error: "soldToId is required" }, { status: 400 });
    const result = await addDynamoSoldTo(params.id, body.soldToId);
    if (result === "exists") return NextResponse.json({ error: "Association already exists" }, { status: 409 });
    if (result === "missing") return NextResponse.json({ error: "User or Sold-To not found" }, { status: 404 });
    return NextResponse.json({ data: { soldToId: body.soldToId } }, { status: 201 });
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userContext } = await validateRequest(req);
    if (userContext.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!isDynamoConfigured()) return NextResponse.json({ error: "DynamoDB is not configured" }, { status: 503 });
    const soldToId = req.nextUrl.searchParams.get("soldToId");
    if (!soldToId) return NextResponse.json({ error: "soldToId is required" }, { status: 400 });
    const removed = await removeDynamoSoldTo(params.id, soldToId);
    return removed ? NextResponse.json({ data: { soldToId } }) : NextResponse.json({ error: "Association not found" }, { status: 404 });
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}