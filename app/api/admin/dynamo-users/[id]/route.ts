import { NextRequest, NextResponse } from "next/server";
import { validateRequest, authErrorResponse } from "@/lib/api/validateRequest";
import { isDynamoConfigured } from "@/lib/db/dynamoClient";
import { updateDynamoUserRole } from "@/lib/crm/dynamoAdminUsers";

const ROLES = ["Admin", "Buyer", "Approver", "Purchasing", "Technician", "Technical Support Only"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userContext } = await validateRequest(req);
    if (userContext.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!isDynamoConfigured()) return NextResponse.json({ error: "DynamoDB is not configured" }, { status: 503 });
    const body = await req.json();
    if (!ROLES.includes(body.role)) return NextResponse.json({ error: "Invalid DynamoDB role" }, { status: 400 });
    const updated = await updateDynamoUserRole(params.id, body.role);
    return updated ? NextResponse.json({ data: { id: params.id, role: body.role } }) : NextResponse.json({ error: "User not found or ambiguous" }, { status: 404 });
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}