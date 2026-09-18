/**
 * Tool-based ReBAC fallback engine
 * ============================================================================
 * Shared fallback used by PingAuthorizeProvider when the PDP is unreachable
 * PingAuthorizeProvider when their respective PDP is not configured or is
 * unreachable. Extracted from the original canAccess.ts so it isn't tied to
 * Permit.io specifically.
 *
 * Models the Honeywell Unified Authorization Fabric:
 *   user → tool entitlement → resource access
 *
 * Tool → Permission mapping:
 *   TL001 (e-Commerce)       → products:view, products:view_pricing, cart:*
 *   TL003 (Order Status)     → orders:view, orders:create
 *   TL009 (My Invoices)      → quotes:view, quotes:create (admin/procurement only)
 *   TL004 (Customer Support) → products:view (no pricing)
 *   isSuperUser / role=admin → full access including admin_dashboard
 */

import type { PermissionAction, PermissionResource, PermitContext, UserRole } from "@/types";

export function toolBasedRebac(
  role: UserRole,
  action: PermissionAction | string,
  resource: PermissionResource | string,
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
      const orgId = resourceAttributes?.sales_org_id as string | undefined;
      const orgAllowed = !orgId || (context?.allowedSalesOrgs ?? []).includes(orgId);
      if (action === "view") return (hasTool("TL001") || hasTool("TL004")) && orgAllowed;
      if (action === "view_pricing") return hasTool("TL001") && orgAllowed;
      return false;
    }

    case "orders":
      if (action === "view") return hasTool("TL003");
      if (action === "create") return hasTool("TL003");
      return false;

    case "quotes":
    case "invoices":
      if (action === "view") return hasTool("TL009");
      if (action === "create") return hasTool("TL009") && (isAdmin || context?.persona === "procurement");
      return false;

    case "cart":
      return hasTool("TL001");

    case "accounts":
      // Sales persona can view accounts; otherwise requires admin (handled above)
      return context?.persona === "sales" && action === "view";

    case "reports":
      // Finance persona can export/view reports
      return context?.persona === "finance" && (action === "view" || action === "manage");

    case "admin_dashboard":
    case "users":
    case "policy_sets":
    case "policies":
      return false; // Only admin (handled above)

    default:
      return false;
  }
}
