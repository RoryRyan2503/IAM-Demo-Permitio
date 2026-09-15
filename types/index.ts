// =============================================================================
// CORE DOMAIN TYPES — Enterprise IAM + FGAC Commerce Demo
// Modelled on the Honeywell Unified Authorization Fabric requirements.
// =============================================================================

// ---------------------------------------------------------------------------
// Auth & Identity
// ---------------------------------------------------------------------------

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  accessToken: string;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// User & Roles
// ---------------------------------------------------------------------------

export type UserRole = "admin" | "buyer" | "viewer";

/** Persona drives ABAC decisions — e.g. only "procurement" can create quotes */
export type UserPersona = "procurement" | "sales" | "finance" | "general" | "GBE";

// ---------------------------------------------------------------------------
// Tool Access (ReBAC — user → tool entitlement)
// Maps to HON portal tool catalogue (TL001 = eCommerce, TL003 = Orders, etc.)
// ---------------------------------------------------------------------------

export type ToolId =
  | "TL001" // e-Commerce / Product Catalog
  | "TL003" // Order Status / Order Management
  | "TL004" // Customer Support
  | "TL009" // My Invoices / Quotes
  | string;

export type ToolStatus = "Approved" | "Pending" | "Rejected" | "Revoked";

export interface ToolAccessGrant {
  id: string;
  masterToolId: ToolId;
  name: string;
  status: ToolStatus;
  requestedDate: string;
  grantedDate: string;
}

// ---------------------------------------------------------------------------
// Sales Area & Organization (matches HON SAP/CRM structure)
// ---------------------------------------------------------------------------

/**
 * A sales area entry as returned by the CRM.
 * One account can have multiple sales areas (different orgs, currencies, divisions).
 */
export interface SalesAreaEntry {
  salesOrg: string;           // e.g. "8421"
  currency: string;           // e.g. "CAD"
  distributionChannel: string; // e.g. "20"
  division: string;           // e.g. "A"
  salesArea: string;          // composite: "8421_20"
}

// ---------------------------------------------------------------------------
// Accounts (multi-SBG, multi-sold-to)
// ---------------------------------------------------------------------------

export interface Account {
  accountId: string;           // e.g. "001ACC001"
  accountName: string;         // e.g. "BlueRock Holdings"
  accountNumber: string;       // ERP account number, e.g. "4098086"
  erpNumber: string;           // SAP ERP number, e.g. "S4H100"
  accountType: "Distributor" | "Partner" | "Customer" | string;
  lineOfBusiness: string[];    // e.g. ["Fire"] or ["IA", "HPS"]
  salesOrgList: SalesAreaEntry[];
  /** Backward-compat list of salesOrg IDs (derived from salesOrgList) */
  salesOrgs: string[];
}

/** A sales organization entity in the database */
export interface SalesOrg {
  id: string;
  name: string;
  accountId: string;
}

// ---------------------------------------------------------------------------
// User (full CRM profile)
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  honId: string;               // Honeywell SSO ID, e.g. "h125001"
  contactId: string;           // SFDC contact ID, e.g. "003CT0001"
  name: string;
  email: string;
  phone: string;               // e.g. "+1 (602) 555-0147"
  department: string;          // e.g. "IT Administration"
  role: UserRole;
  persona: UserPersona;
  userType: "Partner" | "Customer" | "Internal";
  isSuperUser: boolean;
  accounts: Account[];
  /** Explicitly granted tool entitlements (from SFDC portal_user__c / tool_access__c) */
  toolAccess: ToolAccessGrant[];
  /** The currently active sales area (user can switch) */
  activeSalesArea: string | null;
}

// ---------------------------------------------------------------------------
// CRM / Authorization Context
// ---------------------------------------------------------------------------

export interface UserContext {
  user: User;
  selectedAccount: Account | null;
  selectedSalesOrgs: string[];
  activeSalesArea: string | null;
  /** Approved tool IDs for quick lookup in authorization checks */
  approvedToolIds: ToolId[];
}

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

export type PermissionAction =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "view_pricing"
  | "manage";

export type PermissionResource =
  | "products"
  | "orders"
  | "quotes"
  | "cart"
  | "admin_dashboard"
  | "users"
  // Additional resources used by the PingAuthorize demo policy sets
  // (Phase 8 persona scenarios) — not wired into core e-commerce routes.
  | "invoices"
  | "accounts"
  | "reports"
  | "policy_sets"
  | "policies";


export type PermissionMap = Partial<
  Record<`${PermissionAction}:${PermissionResource}`, boolean>
>;

export interface PermitContext {
  selectedAccountId?: string;
  allowedSalesOrgs?: string[];
  activeSalesArea?: string;
  persona?: string;
  /** Approved tool IDs — used in tool-based ReBAC fallback */
  toolIds?: ToolId[];
  isSuperUser?: boolean;
}

// ---------------------------------------------------------------------------
// Commerce — Products
// ---------------------------------------------------------------------------

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  sku: string;
  salesOrgId: string;
  category: string;
  imageUrl?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Commerce — Orders
// ---------------------------------------------------------------------------

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  accountId: string;
  userId: string;
  status: OrderStatus;
  total: number;
  items: OrderItem[];
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Commerce — Quotes
// ---------------------------------------------------------------------------

export type QuoteStatus = "draft" | "submitted" | "approved" | "rejected" | "expired";

export interface QuoteItem {
  id: string;
  quoteId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
}

export interface Quote {
  id: string;
  accountId: string;
  userId: string;
  status: QuoteStatus;
  total: number;
  validUntil: string | null;
  items: QuoteItem[];
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

export interface CartItem {
  id: string;
  userId: string;
  accountId: string;
  productId: string;
  quantity: number;
  addedAt: string;
}

// ---------------------------------------------------------------------------
// API response helpers
// ---------------------------------------------------------------------------

export interface ApiSuccess<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

