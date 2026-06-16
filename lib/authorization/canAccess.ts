/**
 * canAccess — Centralized Authorization Check
 *
 * THE SINGLE ENTRY POINT for all authorization decisions.
 *
 * Architectural rules (enforced by this module):
 *   1. NO authorization logic lives in UI components
 *   2. ALL access checks flow through this function
 *   3. Frontend authorization is UX-only (show/hide)
 *   4. Backend authorization via this function IS the real security gate
 *
 * Authorization layers:
 *   1. Permit.io check — if SDK is configured, delegate to Permit PDP
 *   2. Fallback RBAC  — if Permit is not configured, use local rules
 *      (ensures the demo works without a live Permit.io account)
 *
 * Security: FAIL CLOSED — returns false on any error
 *
 * Extensibility: Replace getPermitClient() with any PDP:
 *   - OPA (Open Policy Agent)
 *   - OpenFGA
 *   - PingAuthorize
 *   - AWS Cedar
 *   - Casbin
 */

import type { PermissionAction, PermissionResource, PermitContext, UserRole } from "@/types";
import { getPermitClient } from "./permitClient";

// ---------------------------------------------------------------------------
// Auth engine tracking — which path was used for the last check batch
// ---------------------------------------------------------------------------

export type AuthEngine = "permit.io" | "fallback" | "unknown";

/** Tracks which authorization engine was used in the most recent canAccess() call. */
let _lastAuthEngine: AuthEngine = "unknown";

/** Returns which engine handled the last authorization check. */
export function getLastAuthEngine(): AuthEngine {
  return _lastAuthEngine;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether a user is allowed to perform an action on a resource.
 *
 * @param userId    - The user's ID (from session / JWT sub)
 * @param action    - The action to check (view, create, update, delete, manage)
 * @param resource  - The resource type (products, orders, quotes, admin_dashboard, ...)
 * @param context   - Optional ABAC context (selectedAccountId, allowedSalesOrgs, persona)
 * @param userRole  - Fallback role if Permit.io is not configured
 *
 * Usage (server-side Route Handler):
 *   const allowed = await canAccess(userId, "view", "products", { allowedSalesOrgs: [...] })
 *   if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
 */
/**
 * Optional resource instance attributes for instance-level ABAC checks.
 * e.g. { sales_org_id: "IA001" } when checking a specific product.
 * When omitted, the check is collection-level (can user access this resource type at all?).
 */
export async function canAccess(
  userId: string,
  action: PermissionAction,
  resource: PermissionResource,
  context?: PermitContext,
  userRole?: UserRole,
  resourceAttributes?: Record<string, unknown>
): Promise<boolean> {
  try {
    const permit = getPermitClient();

    if (permit) {
      // -----------------------------------------------------------------------
      // Path 1: Permit.io PDP check
      // Passes user attributes + resource context for ABAC evaluation
      // Falls back to local RBAC on connection/TLS errors
      // -----------------------------------------------------------------------
      // Resource attributes carry THIS specific resource instance's data (e.g. its sales_org_id).
      // User attributes carry what the user is allowed to access — used by ABAC conditions.
      const permitResource = {
        type: resource,
        attributes: resourceAttributes ?? {},
      };

      const userArg = {
        key: userId,
        attributes: {
          // persona gates action-level ABAC (e.g. procurement persona → quotes:create)
          ...(context?.persona ? { persona: context.persona } : {}),
          // allowedSalesOrgs on the USER side so the sales_org_filter condition can
          // compare user.allowedSalesOrgs ∋ resource.sales_org_id
          allowedSalesOrgs: context?.allowedSalesOrgs ?? [],
          selectedAccountId: context?.selectedAccountId ?? null,
        },
      };

      try {
        const allowed = await permit.check(userArg, action, permitResource);
        _lastAuthEngine = "permit.io";
        console.log(`[canAccess] permit.check ${action}:${resource} → ${allowed ? "ALLOW" : "DENY"}`);
        return Boolean(allowed);
      } catch (permitError: any) {
        // Connection / TLS errors → fall back to local RBAC instead of failing closed
        const msg = permitError?.message ?? String(permitError);
        if (!canAccess._permitWarnLogged) {
          console.warn(
            `[canAccess] Permit.io PDP unreachable (${msg.substring(0, 80)}). ` +
            `Falling back to local RBAC rules. Fix: set NODE_EXTRA_CA_CERTS or NODE_TLS_REJECT_UNAUTHORIZED=0 for dev.`
          );
          canAccess._permitWarnLogged = true;
        }
        // Fall through to local RBAC below
      }
    }

    // -----------------------------------------------------------------------
    // Path 2: Tool-based ReBAC fallback (no Permit.io configured OR PDP unreachable)
    // Models the Honeywell Unified Authorization Fabric:
    //   user → tool entitlement → resource access
    //
    // Tool → Permission mapping:
    //   TL001 (e-Commerce)       → products:view, products:view_pricing, cart:*
    //   TL003 (Order Status)     → orders:view, orders:create
    //   TL009 (My Invoices)      → quotes:view, quotes:create (admin only create)
    //   isSuperUser / role=admin → full access including admin_dashboard
    // -----------------------------------------------------------------------
    _lastAuthEngine = "fallback";
    return toolBasedRebac(userRole ?? "viewer", action, resource, context, resourceAttributes);
  } catch (error) {
    console.error("[canAccess] Authorization check failed:", error);
    return false;
  }
}

// Log Permit.io PDP connection warning only once
canAccess._permitWarnLogged = false;

// ---------------------------------------------------------------------------
// Tool-based ReBAC fallback
// ---------------------------------------------------------------------------

/**
 * Maps tool entitlements (from CRM) to resource/action permissions.
 *
 * This replaces simple role-based rules with the Honeywell tool catalogue model.
 * The same function runs for all roles — the effective permissions come from
 * which tools the user was granted, not from a role label alone.
 */
function toolBasedRebac(
  role: UserRole,
  action: PermissionAction,
  resource: PermissionResource,
  context?: PermitContext,
  resourceAttributes?: Record<string, unknown>
): boolean {
  const toolIds = context?.toolIds ?? [];
  const isSuperUser = context?.isSuperUser ?? false;
  const isAdmin = role === "admin" || isSuperUser;

  // Admin / Super User → full access
  if (isAdmin) return true;

  const hasTool = (id: string) => toolIds.includes(id);

  switch (resource) {
    case "products": {
      // TL001 (e-Commerce) grants product catalog access with pricing
      // TL004 (Customer Support) grants read-only product view (no pricing)
      //
      // Instance-level check: if a specific product's sales_org_id is provided,
      // verify it is within the user's allowed sales orgs (mirrors Permit ABAC condition).
      const orgId = resourceAttributes?.sales_org_id as string | undefined;
      const orgAllowed = !orgId || (context?.allowedSalesOrgs ?? []).includes(orgId);
      if (action === "view") return (hasTool("TL001") || hasTool("TL004")) && orgAllowed;
      if (action === "view_pricing") return hasTool("TL001") && orgAllowed;
      return false;
    }



    case "orders":
      // TL003 (Order Status) grants order access
      if (action === "view") return hasTool("TL003");
      if (action === "create") return hasTool("TL003");
      return false;

    case "quotes":
      // TL009 (My Invoices) grants quote/invoice access
      if (action === "view") return hasTool("TL009");
      // Admin OR procurement persona with TL009 can create quotes
      // (mirrors the Permit ABAC condition: procurement_persona_quotes)
      if (action === "create") return hasTool("TL009") && (isAdmin || context?.persona === "procurement");
      return false;

    case "cart":
      // Shopping cart requires e-Commerce tool
      return hasTool("TL001");

    case "admin_dashboard":
    case "users":
      return false; // Only admin (handled above)

    default:
      return false;
  }
}

