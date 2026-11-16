import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamoDocClient, getSeedTableName } from "@/lib/db/dynamoClient";

export interface AvailableTool {
  id: string;
  name: string;
  description: string;
  url: string | null;
  status: "Approved" | "Pending" | "Requestable";
}

interface ToolRow {
  tool_id?: string;
  tool_name?: string;
  description?: string;
  url?: string;
  sbg?: string | string[];
  sold_to_id?: string | string[];
}

interface AccessRow {
  tool_id?: string;
  access_status?: string;
  sbg?: string | string[];
  sold_to_id?: string | string[];
}

function matches(value: string | string[] | undefined, selected: string | undefined): boolean {
  return Boolean(selected && (Array.isArray(value) ? value.includes(selected) : value === selected));
}

function inScope(row: { sbg?: string | string[]; sold_to_id?: string | string[] }, accountId: string, sbgs: string[]): boolean {
  if (row.sold_to_id !== undefined && !matches(row.sold_to_id, accountId)) return false;
  if (row.sbg !== undefined && !sbgs.some((sbg) => matches(row.sbg, sbg))) return false;
  return row.sold_to_id !== undefined || row.sbg !== undefined;
}

async function scanAll<T>(table: "tools" | "user_tool_access", userId?: string): Promise<T[]> {
  const items: T[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const response = await getDynamoDocClient().send(new ScanCommand({
      TableName: getSeedTableName(table),
      ...(userId ? { FilterExpression: "user_id = :uid", ExpressionAttributeValues: { ":uid": userId } } : {}),
      ExclusiveStartKey,
    }));
    items.push(...(response.Items ?? []) as T[]);
    ExclusiveStartKey = response.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

export function selectAvailableTools(tools: ToolRow[], grants: AccessRow[], accountId: string, sbgs: string[]): AvailableTool[] {
  const scopedGrants = new Map<string, string>();
  const ambiguousIds = new Set<string>();
  const toolScopes = new Map<string, string>();
  for (const tool of tools) {
    if (!tool.tool_id) continue;
    const scope = JSON.stringify([tool.sbg, tool.sold_to_id]);
    if (toolScopes.has(tool.tool_id) && toolScopes.get(tool.tool_id) !== scope) ambiguousIds.add(tool.tool_id);
    toolScopes.set(tool.tool_id, scope);
  }
  for (const grant of grants) {
    if (!grant.tool_id) continue;
    const hasScope = grant.sbg !== undefined || grant.sold_to_id !== undefined;
    if (hasScope ? !inScope(grant, accountId, sbgs) : ambiguousIds.has(grant.tool_id)) continue;
    const current = scopedGrants.get(grant.tool_id);
    if (grant.access_status === "APPROVED" || (grant.access_status === "PENDING" && current !== "APPROVED")) {
      scopedGrants.set(grant.tool_id, grant.access_status);
    }
  }

  return tools.filter((tool) => tool.tool_id && inScope(tool, accountId, sbgs)).map((tool) => {
    const grant = scopedGrants.get(tool.tool_id!);
    let url: string | null = null;
    if (tool.url) {
      try {
        const parsed = new URL(tool.url);
        if (parsed.protocol === "https:" || parsed.protocol === "http:") url = parsed.href;
      } catch { url = null; }
    }
    return {
      id: tool.tool_id!,
      name: tool.tool_name || tool.tool_id!,
      description: tool.description ?? "",
      url,
      status: grant === "APPROVED" ? "Approved" : grant === "PENDING" ? "Pending" : "Requestable",
    };
  });
}

export async function getAvailableTools(userId: string, accountId: string, sbgs: string[]): Promise<AvailableTool[]> {
  const [tools, grants] = await Promise.all([
    scanAll<ToolRow>("tools"),
    scanAll<AccessRow>("user_tool_access", userId),
  ]);
  return selectAvailableTools(tools, grants, accountId, sbgs);
}