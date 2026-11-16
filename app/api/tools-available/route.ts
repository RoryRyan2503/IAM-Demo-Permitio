import { NextRequest, NextResponse } from "next/server";
import { validateRequest, authErrorResponse } from "@/lib/api/validateRequest";
import { getAvailableTools } from "@/lib/crm/availableTools";
import { isDynamoConfigured } from "@/lib/db/dynamoClient";

export async function GET(req: NextRequest) {
  try {
    const { session, userContext } = await validateRequest(req);
    const account = userContext.selectedAccount;
    if (!account || !isDynamoConfigured()) return NextResponse.json({ tools: [] });

    const sbgs = account.lineOfBusiness;
    const tools = await getAvailableTools(session.userId, account.accountId, sbgs);
    return NextResponse.json({ tools });
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}