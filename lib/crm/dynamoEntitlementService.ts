/**
 * DynamoDB-backed entitlement resolution for the local-mock-IDP users.
 *
 *   JWT sub (userId) → seed-*-users / seed-*-user_sold_to / seed-*-sold_to
 *   / seed-*-user_tool_access → UserContext (accounts/tools/role)
 *
 * Mirrors lib/crm/crmService.ts's UserContext shape exactly so the rest of
 * the app (AccountContext/AccountSwitcher/canAccess/validateRequest/etc.)
 * needs no changes to consume it — only the *source* differs.
 *
 * Real table shapes (none of these tables have a GSI on `user_id`, so
 * per-user lookups are FilterExpression scans — fine at this table's scale
 * for a POC; add a GSI on `user_id` before using this at production scale):
 *
 *   users            : { user_id, honeywell_id, first_name, last_name, email,
 *                        user_role, user_type, is_super_user, sbg, contact_id }
 *   sold_to          : { _id, sold_to_id, account_id, sold_to_details: [
 *                        { salesOrg, currencyIso, distributionChannel,
 *                          salesOffice, customerTier, countryCode, ... } ] }
 *   user_sold_to     : { user_id, sold_to_id, role, status, is_default }
 *   user_tool_access : { user_id, tool_id, tool_name, access_status,
 *                        requested_date, granted_date }
 *
 * IMPORTANT: per product decision, Sold-To accounts are derived from
 * `sold_to` (joined via `user_sold_to`) — the separate `accounts` table is
 * NOT used to drive which accounts a user has access to.
 */

import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamoDocClient, getSeedTableName, isDynamoConfigured } from "@/lib/db/dynamoClient";
import type { User, UserContext, UserRole, Account, SalesAreaEntry, ToolAccessGrant, ToolId } from "@/types";

interface DynamoUserItem {
  user_id: string;
  honeywell_id?: string;
  contact_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  user_role?: string;
  user_type?: "Employee" | "Channel Partner";
  is_super_user?: boolean;
  sbg?: string;
}

interface SoldToDetail {
  salesOrg: string;
  currencyIso: string;
  distributionChannel: string;
  salesOffice?: string;
  customerTier?: string;
  sbg?: string;
}

interface DynamoSoldToItem {
  sold_to_id: string;
  account_id?: string;
  sbg?: string;
  sold_to_details?: SoldToDetail[];
}

interface DynamoUserSoldToItem {
  user_id: string;
  sold_to_id: string;
  role?: string;
  status?: string;
  is_default?: boolean;
}

interface DynamoUserToolAccessItem {
  user_id: string;
  tool_id: string;
  tool_name?: string;
  access_status?: string;
  requested_date?: string | null;
  granted_date?: string | null;
}

/** Maps the DynamoDB `user_role`/`user_sold_to.role` free-form values onto the app's closed UserRole union. */
const DYNAMO_ROLE_MAP: Record<string, UserRole> = {
  Admin: "admin",
  Buyer: "buyer",
  Approver: "buyer",
  Purchasing: "buyer",
  Technician: "viewer",
  "Technical Support Only": "viewer",
};

function mapRole(raw: string | undefined): UserRole {
  return (raw ? DYNAMO_ROLE_MAP[raw] : undefined) ?? "viewer";
}

function mapToolStatus(raw: string | undefined): ToolAccessGrant["status"] {
  switch (raw) {
    case "APPROVED": return "Approved";
    case "PENDING": return "Pending";
    case "REJECTED": return "Rejected";
    case "REVOKED": return "Revoked";
    default: return "Pending";
  }
}

// ---------------------------------------------------------------------------
// Scan helpers — every table's partition key is `_id`, NOT `user_id`/
// `sold_to_id`, so per-user/per-sold-to lookups require a filtered Scan.
// ---------------------------------------------------------------------------

async function scanByUserId<T>(tableSuffix: "users" | "user_sold_to" | "user_tool_access", userId: string): Promise<T[]> {
  const doc = getDynamoDocClient();
  const items: T[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await doc.send(
      new ScanCommand({
        TableName: getSeedTableName(tableSuffix),
        FilterExpression: "user_id = :uid",
        ExpressionAttributeValues: { ":uid": userId },
        ExclusiveStartKey,
      })
    );
    items.push(...((res.Items ?? []) as T[]));
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

/** Full-table scan of `sold_to`, cached briefly in memory (small reference table). */
let _soldToCache: { byId: Map<string, DynamoSoldToItem>; expiresAt: number } | null = null;
const SOLD_TO_CACHE_TTL_MS = 60_000;

async function getSoldToMap(): Promise<Map<string, DynamoSoldToItem>> {
  if (_soldToCache && _soldToCache.expiresAt > Date.now()) return _soldToCache.byId;

  const doc = getDynamoDocClient();
  const byId = new Map<string, DynamoSoldToItem>();
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await doc.send(
      new ScanCommand({ TableName: getSeedTableName("sold_to"), ExclusiveStartKey })
    );
    for (const item of (res.Items ?? []) as DynamoSoldToItem[]) {
      byId.set(item.sold_to_id, item);
    }
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  _soldToCache = { byId, expiresAt: Date.now() + SOLD_TO_CACHE_TTL_MS };
  return byId;
}

function soldToToAccount(soldTo: DynamoSoldToItem): Account {
  const details = soldTo.sold_to_details ?? [];
  const salesOrgList: SalesAreaEntry[] = details.map((d) => ({
    salesOrg: d.salesOrg,
    currency: d.currencyIso,
    distributionChannel: d.distributionChannel,
    division: d.salesOffice ?? "",
    salesArea: `${d.salesOrg}_${d.distributionChannel}`,
  }));

  return {
    accountId: soldTo.sold_to_id,
    accountName: `Sold-To ${soldTo.sold_to_id}`,
    accountNumber: soldTo.sold_to_id,
    erpNumber: soldTo.account_id ?? "",
    accountType: details[0]?.customerTier ?? "Standard",
    lineOfBusiness: Array.from(new Set([soldTo.sbg, ...details.map((detail) => detail.sbg)].filter((sbg): sbg is string => Boolean(sbg)))),
    salesOrgList,
    salesOrgs: salesOrgList.map((s) => s.salesOrg),
  };
}

function emptyContext(userId: string): UserContext {
  return {
    user: {
      id: userId,
      honId: "",
      contactId: "",
      name: userId,
      email: "",
      phone: "",
      department: "",
      role: "viewer",
      persona: "general",
      userType: "Customer",
      isSuperUser: false,
      accounts: [],
      toolAccess: [],
      activeSalesArea: null,
    },
    selectedAccount: null,
    selectedSalesOrgs: [],
    activeSalesArea: null,
    approvedToolIds: [],
  };
}

export async function getUserContextFromDynamo(
  userId: string,
  selectedAccountId?: string
): Promise<UserContext> {
  if (!isDynamoConfigured()) {
    console.warn(
      `[dynamoEntitlementService] DYNAMODB_REGION/DYNAMODB_TABLE_PREFIX not set — returning no entitlements for ${userId}`
    );
    throw Object.assign(new Error("DynamoDB is not configured. Check the AWS region and table settings."), { statusCode: 503 });
  }

  try {
    const [userRows, userSoldToRows, userToolAccessRows] = await Promise.all([
      scanByUserId<DynamoUserItem>("users", userId),
      scanByUserId<DynamoUserSoldToItem>("user_sold_to", userId),
      scanByUserId<DynamoUserToolAccessItem>("user_tool_access", userId),
    ]);

    const userItem = userRows[0];
    if (!userItem) {
      console.warn(`[dynamoEntitlementService] No users record found for userId=${userId}`);
      throw Object.assign(new Error("No DynamoDB profile matches the signed-in user. Check the identity mapping."), { statusCode: 404 });
    }

    const soldToMap = await getSoldToMap();
    const activeSoldTos = userSoldToRows.filter((r) => (r.status ?? "ACTIVE") === "ACTIVE");
    const accounts: Account[] = activeSoldTos
      .map((r) => soldToMap.get(r.sold_to_id))
      .filter((s): s is DynamoSoldToItem => Boolean(s))
      .map(soldToToAccount);

    const toolAccess: ToolAccessGrant[] = userToolAccessRows.map((r) => ({
      id: r.tool_id,
      masterToolId: r.tool_id as ToolId,
      name: r.tool_name ?? r.tool_id,
      status: mapToolStatus(r.access_status),
      requestedDate: r.requested_date ?? "",
      grantedDate: r.granted_date ?? "",
    }));

    const user: User = {
      id: userId,
      honId: userItem.honeywell_id ?? "",
      contactId: userItem.contact_id ?? "",
      name: `${userItem.first_name} ${userItem.last_name}`,
      email: userItem.email,
      phone: "",
      department: userItem.sbg ?? "",
      role: mapRole(userItem.user_role),
      persona: "general",
      userType: userItem.user_type === "Employee" ? "Internal" : "Partner",
      isSuperUser: userItem.is_super_user ?? false,
      accounts,
      toolAccess,
      activeSalesArea: accounts[0]?.salesOrgList[0]?.salesArea ?? null,
    };

    const defaultSoldTo = activeSoldTos.find((r) => r.is_default) ?? activeSoldTos[0];
    const effectiveAccountId = selectedAccountId ?? defaultSoldTo?.sold_to_id ?? accounts[0]?.accountId ?? null;
    const selectedAccount = effectiveAccountId
      ? (accounts.find((a) => a.accountId === effectiveAccountId) ?? accounts[0] ?? null)
      : null;

    const selectedSalesOrgs = selectedAccount?.salesOrgs ?? [];
    const activeSalesArea = selectedAccount?.salesOrgList[0]?.salesArea ?? null;

    const approvedToolIds: ToolId[] = toolAccess
      .filter((t) => t.status === "Approved")
      .map((t) => t.masterToolId);

    return { user, selectedAccount, selectedSalesOrgs, activeSalesArea, approvedToolIds };
  } catch (err) {
    console.warn(
      `[dynamoEntitlementService] DynamoDB lookup failed for userId=${userId}:`,
      err instanceof Error ? err.message : err
    );
    if (err instanceof Error && "statusCode" in err && err.statusCode === 404) throw err;
    const expired = err instanceof Error && /expired|ExpiredToken/i.test(`${err.name} ${err.message}`);
    throw Object.assign(new Error(expired
      ? "AWS session credentials have expired. Refresh the access key, secret key and session token in .env.local, then restart the app."
      : "Unable to load your profile from DynamoDB. Check AWS credentials, connectivity and table permissions."), { statusCode: 503 });
  }
}

export async function userHasAccountAccessDynamo(userId: string, accountId: string): Promise<boolean> {
  const ctx = await getUserContextFromDynamo(userId);
  return ctx.user.accounts.some((a) => a.accountId === accountId);
}
