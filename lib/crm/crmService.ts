/**
 * CRM Service — Supabase-first, mockData fallback
 *
 * Primary : queries Supabase (users, user_accounts, account_sales_areas,
 *           user_tool_access) — seeded by migration 003_crm_tables.sql
 * Fallback: if user not found in DB, falls back to mockData.
 *
 *   JWT (identity) → Supabase CRM tables → Authorization Engine
 */

import type {
  User,
  Account,
  UserContext,
  ToolId,
  ToolAccessGrant,
  SalesAreaEntry,
} from "@/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  CRM_USERS_BY_ID,
  CRM_USERS_BY_EMAIL,
  type CrmUser,
} from "./mockData";

// ---------------------------------------------------------------------------
// Data source tracking
// ---------------------------------------------------------------------------

export type DataSource = "supabase" | "mock" | "unknown";

let _lastDataSource: DataSource = "unknown";

export function getLastDataSource(): DataSource {
  return _lastDataSource;
}

// ---------------------------------------------------------------------------
// Supabase CRM lookup
// ---------------------------------------------------------------------------

interface DbSalesArea {
  sales_org_id: string;
  currency: string;
  distribution_channel: string;
  division: string;
  sales_area: string;
}

interface DbAccount {
  id: string;
  account_name: string;
  account_number: string | null;
  erp_number: string | null;
  account_type: string;
  line_of_business: string[];
  account_sales_areas: DbSalesArea[];
}

async function fetchUserFromDB(
  userId: string
): Promise<{
  user: any;
  tools: any[];
  accounts: DbAccount[];
} | null> {
  const supabase = getSupabaseServerClient();

  const [userRes, toolsRes, accountsRes] = await Promise.all([
    supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single(),

    supabase
      .from("user_tool_access")
      .select("id, master_tool_id, tool_name, status, requested_date, granted_date")
      .eq("user_id", userId),

    supabase
      .from("user_accounts")
      .select(
        `accounts (
          id, account_name, account_number, erp_number, account_type, line_of_business,
          account_sales_areas (
            sales_org_id, currency, distribution_channel, division, sales_area
          )
        )`
      )
      .eq("user_id", userId),
  ]);

  if (userRes.error || !userRes.data) {
    console.warn("[crmService] DB user lookup failed:", userRes.error?.message ?? "no data");
    return null;
  }

  if (accountsRes.error) {
    console.warn("[crmService] DB accounts lookup failed:", accountsRes.error.message);
  }
  if (toolsRes.error) {
    console.warn("[crmService] DB tools lookup failed:", toolsRes.error.message);
  }

  const accounts = (accountsRes.data ?? [])
    .map((row: any) => row.accounts as DbAccount)
    .filter(Boolean);

  return {
    user: userRes.data,
    tools: toolsRes.data ?? [],
    accounts,
  };
}

function buildContextFromDB(
  dbUser: any,
  dbTools: any[],
  dbAccounts: DbAccount[],
  selectedAccountId?: string
): UserContext {
  const accounts: Account[] = dbAccounts.map((acc) => ({
    accountId: acc.id,
    accountName: acc.account_name,
    accountNumber: acc.account_number ?? acc.id,
    erpNumber: acc.erp_number ?? "",
    accountType: acc.account_type as Account["accountType"],
    lineOfBusiness: acc.line_of_business ?? [],
    salesOrgList: (acc.account_sales_areas ?? []).map(
      (sa): SalesAreaEntry => ({
        salesOrg: sa.sales_org_id,
        currency: sa.currency,
        distributionChannel: sa.distribution_channel,
        division: sa.division,
        salesArea: sa.sales_area,
      })
    ),
    salesOrgs: (acc.account_sales_areas ?? []).map((sa) => sa.sales_org_id),
  }));

  const toolAccess: ToolAccessGrant[] = dbTools.map((t) => ({
    id: t.id,
    masterToolId: t.master_tool_id as ToolId,
    name: t.tool_name,
    status: t.status as ToolAccessGrant["status"],
    requestedDate: t.requested_date,
    grantedDate: t.granted_date,
  }));

  const user: User = {
    id: dbUser.id,
    honId: dbUser.hon_id ?? "",
    contactId: dbUser.contact_id ?? "",
    name: dbUser.name,
    email: dbUser.email,
    phone: dbUser.phone ?? "",
    department: dbUser.department ?? "",
    role: dbUser.role as User["role"],
    persona: dbUser.persona as User["persona"],
    userType: (dbUser.user_type ?? "Customer") as User["userType"],
    isSuperUser: dbUser.is_super_user ?? false,
    accounts,
    toolAccess,
    activeSalesArea: dbUser.active_sales_area,
  };

  const effectiveAccountId =
    selectedAccountId ?? accounts[0]?.accountId ?? null;
  const selectedAccount = effectiveAccountId
    ? (accounts.find((a) => a.accountId === effectiveAccountId) ??
        accounts[0] ??
        null)
    : null;

  const selectedSalesOrgs = selectedAccount?.salesOrgs ?? [];

  const activeSalesArea =
    selectedAccount?.salesOrgList.find(
      (s) => s.salesArea === dbUser.active_sales_area
    )?.salesArea ??
    selectedAccount?.salesOrgList[0]?.salesArea ??
    null;

  const approvedToolIds: ToolId[] = dbTools
    .filter((t) => t.status === "Approved")
    .map((t) => t.master_tool_id as ToolId);

  return {
    user,
    selectedAccount,
    selectedSalesOrgs,
    activeSalesArea,
    approvedToolIds,
  };
}

// ---------------------------------------------------------------------------
// mockData fallback (identical logic, sync)
// ---------------------------------------------------------------------------

function buildContextFromMock(
  userId: string,
  email?: string,
  selectedAccountId?: string
): UserContext {
  let crmUser: CrmUser | null = CRM_USERS_BY_ID[userId] ?? null;
  if (!crmUser && email)
    crmUser = CRM_USERS_BY_EMAIL[email.toLowerCase()] ?? null;

  if (!crmUser) {
    return {
      user: {
        id: userId,
        honId: "",
        contactId: "",
        name: email?.split("@")[0] ?? "Unknown",
        email: email ?? "",
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

  const user: User = {
    id: crmUser.id,
    honId: crmUser.honId,
    contactId: crmUser.contactId,
    name: crmUser.name,
    email: crmUser.email,
    phone: crmUser.phone,
    department: crmUser.department,
    role: crmUser.role,
    persona: crmUser.persona,
    userType: crmUser.userType,
    isSuperUser: crmUser.isSuperUser,
    accounts: crmUser.accounts,
    toolAccess: crmUser.toolAccess,
    activeSalesArea: crmUser.activeSalesArea,
  };

  const effectiveAccountId =
    selectedAccountId ?? crmUser.accounts[0]?.accountId ?? null;
  const selectedAccount = effectiveAccountId
    ? (crmUser.accounts.find((a) => a.accountId === effectiveAccountId) ??
        crmUser.accounts[0] ??
        null)
    : null;

  const selectedSalesOrgs = selectedAccount?.salesOrgs ?? [];

  const activeSalesArea =
    selectedAccount?.salesOrgList.find(
      (s) => s.salesArea === crmUser!.activeSalesArea
    )?.salesArea ??
    selectedAccount?.salesOrgList[0]?.salesArea ??
    null;

  const approvedToolIds: ToolId[] = crmUser.toolAccess
    .filter((t) => t.status === "Approved")
    .map((t) => t.masterToolId);

  return {
    user,
    selectedAccount,
    selectedSalesOrgs,
    activeSalesArea,
    approvedToolIds,
  };
}

// ---------------------------------------------------------------------------
// Public API — async, Supabase-first with mockData fallback
// ---------------------------------------------------------------------------

export async function getUserContext(
  userId: string,
  email?: string,
  selectedAccountId?: string
): Promise<UserContext> {
  try {
    const db = await fetchUserFromDB(userId);
    if (db) {
      _lastDataSource = "supabase";
      console.log("[crmService] Using Supabase data for", userId, "— accounts:", db.accounts.length, "tools:", db.tools.length);
      return buildContextFromDB(db.user, db.tools, db.accounts, selectedAccountId);
    }
    console.log("[crmService] User not found in DB, falling back to mock for", userId);
  } catch (err: any) {
    console.warn(
      "[crmService] Supabase CRM lookup failed, using mock data:",
      err?.message?.substring(0, 200)
    );
  }
  _lastDataSource = "mock";
  return buildContextFromMock(userId, email, selectedAccountId);
}

export async function userHasAccountAccess(
  userId: string,
  accountId: string
): Promise<boolean> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("user_accounts")
      .select("account_id")
      .eq("user_id", userId)
      .eq("account_id", accountId)
      .maybeSingle();
    if (!error) return data !== null;
  } catch {
    // fall through to mock
  }
  const user = CRM_USERS_BY_ID[userId] ?? null;
  return user?.accounts.some((a) => a.accountId === accountId) ?? false;
}

export async function getUserAccounts(userId: string): Promise<Account[]> {
  const ctx = await getUserContext(userId);
  return ctx.user.accounts;
}

