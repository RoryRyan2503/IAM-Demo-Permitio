/**
 * CRM Mock Data — Honeywell B2B Portal
 *
 * Based on the Unified Authorization Fabric requirements doc.
 * Mirrors the shape of real SFDC/SAP data the CRM API would return.
 *
 * Five accounts, three demo users:
 *   1. Miguel Patel  — Admin/Partner, all 4 tools, ALL accounts (5)
 *   2. Carlos Johnson — Standard Partner, Order Status + Support, 2 accounts
 *   3. Sarah Chen    — Limited Customer, My Invoices only, 1 account
 *
 * Sales Org Format (standardized):
 *   BA01, BA02 — Building Automation
 *   PT01, PT02, PT03 — Process Technology
 *   PA01, PA02 — Process Automation
 *   IA01, IA02 — Industrial Automation
 *
 * Tool → Permission mapping (ReBAC):
 *   TL001 (e-Commerce)       → view products, view pricing, manage cart
 *   TL003 (Order Status)     → view + create orders
 *   TL004 (Customer Support) → view products (read-only, no pricing)
 *   TL009 (My Invoices)      → view + create quotes/invoices
 *   isSuperUser / role=admin → admin dashboard, user management
 */

import type { User, Account, UserPersona, UserRole, ToolAccessGrant, SalesAreaEntry } from "@/types";

// ---------------------------------------------------------------------------
// Helper — build Account from the CRM sales_org_list shape
// ---------------------------------------------------------------------------

function buildAccount(
  id: string,
  name: string,
  number: string,
  erp: string,
  type: string,
  lob: string[],
  salesOrgList: SalesAreaEntry[]
): Account {
  return {
    accountId: id,
    accountName: name,
    accountNumber: number,
    erpNumber: erp,
    accountType: type,
    lineOfBusiness: lob,
    salesOrgList,
    salesOrgs: salesOrgList.map((s) => s.salesOrg),
  };
}

// ---------------------------------------------------------------------------
// Accounts — 5 total with standardized sales orgs
// ---------------------------------------------------------------------------

const HONEYWELL_ACCOUNT = buildAccount(
  "001ACC001",
  "Honeywell International",
  "4098086",
  "S4H100",
  "Distributor",
  ["Building Automation", "Process Technology"],
  [
    { salesOrg: "BA01", currency: "USD", distributionChannel: "10", division: "B", salesArea: "BA01_10" },
    { salesOrg: "BA02", currency: "EUR", distributionChannel: "20", division: "B", salesArea: "BA02_20" },
    { salesOrg: "PT01", currency: "USD", distributionChannel: "10", division: "P", salesArea: "PT01_10" },
    { salesOrg: "PT02", currency: "EUR", distributionChannel: "20", division: "P", salesArea: "PT02_20" },
  ]
);

const WHOLE_FOODS_ACCOUNT = buildAccount(
  "001ACC002",
  "Whole Foods Market",
  "2810713",
  "S4H100",
  "Partner",
  ["Building Automation", "Process Automation"],
  [
    { salesOrg: "BA01", currency: "USD", distributionChannel: "10", division: "B", salesArea: "BA01_10" },
    { salesOrg: "PA01", currency: "USD", distributionChannel: "10", division: "A", salesArea: "PA01_10" },
    { salesOrg: "PA02", currency: "EUR", distributionChannel: "20", division: "A", salesArea: "PA02_20" },
  ]
);

const GREENTECH_ACCOUNT = buildAccount(
  "001ACC003",
  "GreenTech Systems",
  "3920187",
  "S4H200",
  "Customer",
  ["Industrial Automation"],
  [
    { salesOrg: "IA01", currency: "USD", distributionChannel: "10", division: "I", salesArea: "IA01_10" },
    { salesOrg: "IA02", currency: "EUR", distributionChannel: "20", division: "I", salesArea: "IA02_20" },
  ]
);

const TESLA_ACCOUNT = buildAccount(
  "001ACC004",
  "Tesla Energy",
  "5501298",
  "S4H300",
  "Partner",
  ["Process Technology", "Industrial Automation"],
  [
    { salesOrg: "PT01", currency: "USD", distributionChannel: "10", division: "P", salesArea: "PT01_10" },
    { salesOrg: "PT03", currency: "GBP", distributionChannel: "30", division: "P", salesArea: "PT03_30" },
    { salesOrg: "IA01", currency: "USD", distributionChannel: "10", division: "I", salesArea: "IA01_10" },
  ]
);

const SIEMENS_ACCOUNT = buildAccount(
  "001ACC005",
  "Siemens AG",
  "6702411",
  "S4H400",
  "Distributor",
  ["Process Automation", "Process Technology"],
  [
    { salesOrg: "PA01", currency: "USD", distributionChannel: "10", division: "A", salesArea: "PA01_10" },
    { salesOrg: "PA02", currency: "EUR", distributionChannel: "20", division: "A", salesArea: "PA02_20" },
    { salesOrg: "PT02", currency: "EUR", distributionChannel: "20", division: "P", salesArea: "PT02_20" },
    { salesOrg: "PT03", currency: "GBP", distributionChannel: "30", division: "P", salesArea: "PT03_30" },
  ]
);

const BOEING_ACCOUNT = buildAccount(
  "001ACC006",
  "Boeing Aerospace",
  "7813562",
  "S4H500",
  "Distributor",
  ["Process Technology", "Industrial Automation"],
  [
    { salesOrg: "PT02", currency: "USD", distributionChannel: "10", division: "P", salesArea: "PT02_10" },
    { salesOrg: "IA02", currency: "EUR", distributionChannel: "20", division: "I", salesArea: "IA02_20" },
  ]
);

const TOYOTA_ACCOUNT = buildAccount(
  "001ACC007",
  "Toyota Manufacturing",
  "8924673",
  "S4H600",
  "Partner",
  ["Building Automation", "Process Automation"],
  [
    { salesOrg: "BA02", currency: "USD", distributionChannel: "10", division: "B", salesArea: "BA02_10" },
    { salesOrg: "PA01", currency: "JPY", distributionChannel: "30", division: "A", salesArea: "PA01_30" },
  ]
);

// ---------------------------------------------------------------------------
// Tool grants
// ---------------------------------------------------------------------------

const ALL_TOOLS: ToolAccessGrant[] = [
  { id: "CTA-003CT0001-TL003", masterToolId: "TL003", name: "Order Status",      status: "Approved", requestedDate: "2026-04-10T00:00:00Z", grantedDate: "2026-04-24T00:00:00Z" },
  { id: "CTA-003CT0001-TL001", masterToolId: "TL001", name: "e-Commerce",        status: "Approved", requestedDate: "2026-04-27T00:00:00Z", grantedDate: "2026-04-27T00:00:00Z" },
  { id: "CTA-003CT0001-TL004", masterToolId: "TL004", name: "Customer Support",  status: "Approved", requestedDate: "2026-01-03T00:00:00Z", grantedDate: "2026-01-12T00:00:00Z" },
  { id: "CTA-003CT0001-TL009", masterToolId: "TL009", name: "My Invoices",       status: "Approved", requestedDate: "2026-04-27T00:00:00Z", grantedDate: "2026-05-09T00:00:00Z" },
];

const PARTNER_TOOLS: ToolAccessGrant[] = [
  { id: "CTA-003CT0002-TL003", masterToolId: "TL003", name: "Order Status",      status: "Approved", requestedDate: "2026-03-15T00:00:00Z", grantedDate: "2026-03-20T00:00:00Z" },
  { id: "CTA-003CT0002-TL004", masterToolId: "TL004", name: "Customer Support",  status: "Approved", requestedDate: "2026-03-15T00:00:00Z", grantedDate: "2026-03-20T00:00:00Z" },
];

const LIMITED_TOOLS: ToolAccessGrant[] = [
  { id: "CTA-003CT0003-TL004", masterToolId: "TL004", name: "Customer Support",  status: "Approved", requestedDate: "2026-04-20T00:00:00Z", grantedDate: "2026-04-25T00:00:00Z" },
  { id: "CTA-003CT0003-TL009", masterToolId: "TL009", name: "My Invoices",       status: "Approved", requestedDate: "2026-05-01T00:00:00Z", grantedDate: "2026-05-05T00:00:00Z" },
];

// ---------------------------------------------------------------------------
// CRM User interface
// ---------------------------------------------------------------------------

export interface CrmUser {
  id: string;
  honId: string;
  contactId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  role: UserRole;
  persona: UserPersona;
  userType: "Partner" | "Customer" | "Internal";
  isSuperUser: boolean;
  accounts: Account[];
  toolAccess: ToolAccessGrant[];
  activeSalesArea: string;
}

// ---------------------------------------------------------------------------
// Users — three Honeywell B2B demo personas
// ---------------------------------------------------------------------------

export const CRM_USERS: CrmUser[] = [
  {
    // ── User 1: Miguel Patel — Admin with ALL accounts
    id: "user-admin",
    honId: "h125001",
    contactId: "003CT0001",
    name: "Miguel Patel",
    email: "admin@demo.com",
    phone: "+1 (602) 555-0147",
    department: "IT Administration",
    role: "admin",
    persona: "GBE",
    userType: "Partner",
    isSuperUser: false,
    activeSalesArea: "BA01_10",
    toolAccess: ALL_TOOLS,
    accounts: [HONEYWELL_ACCOUNT, WHOLE_FOODS_ACCOUNT, GREENTECH_ACCOUNT, TESLA_ACCOUNT, SIEMENS_ACCOUNT, BOEING_ACCOUNT, TOYOTA_ACCOUNT],
  },
  {
    // ── User 2: Carlos Johnson — Buyer with 2 accounts
    id: "user-buyer",
    honId: "h125002",
    contactId: "003CT0002",
    name: "Carlos Johnson",
    email: "buyer@demo.com",
    phone: "+1 (312) 555-0234",
    department: "Procurement",
    role: "buyer",
    persona: "GBE",
    userType: "Partner",
    isSuperUser: false,
    activeSalesArea: "PA01_10",
    toolAccess: PARTNER_TOOLS,
    accounts: [WHOLE_FOODS_ACCOUNT, TESLA_ACCOUNT],
  },
  {
    // ── User 3: Sarah Chen — Viewer with 1 account
    id: "user-viewer",
    honId: "h125003",
    contactId: "003CT0003",
    name: "Sarah Chen",
    email: "viewer@demo.com",
    phone: "+1 (415) 555-0389",
    department: "Operations",
    role: "viewer",
    persona: "general",
    userType: "Customer",
    isSuperUser: false,
    activeSalesArea: "IA01_10",
    toolAccess: LIMITED_TOOLS,
    accounts: [GREENTECH_ACCOUNT],
  },
];

export const CRM_USERS_BY_ID: Record<string, CrmUser> = Object.fromEntries(
  CRM_USERS.map((u) => [u.id, u])
);

export const CRM_USERS_BY_EMAIL: Record<string, CrmUser> = Object.fromEntries(
  CRM_USERS.map((u) => [u.email.toLowerCase(), u])
);
