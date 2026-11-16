import { NextRequest, NextResponse } from "next/server";
import { validateRequest, authErrorResponse } from "@/lib/api/validateRequest";
import { isDynamoConfigured } from "@/lib/db/dynamoClient";
import { listDynamoSoldTos } from "@/lib/crm/dynamoAdminUsers";

export async function GET(req: NextRequest) {
  try {
    const { userContext } = await validateRequest(req);
    if (userContext.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!isDynamoConfigured()) return NextResponse.json({ error: "DynamoDB is not configured" }, { status: 503 });
    return NextResponse.json({ data: await listDynamoSoldTos() });
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}