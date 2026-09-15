/**
 * canAccess — DEPRECATED thin wrapper, kept for backward compatibility
 * ============================================================================
 * This module used to contain all Permit.io logic + the tool-based ReBAC
 * fallback directly. As part of the multi-provider authorization migration,
 * that logic moved to:
 *   - lib/authorization/providers/PermitProvider.ts        (Permit.io logic)
 *   - lib/authorization/providers/PingAuthorizeProvider.ts (PingAuthorize logic)
 *   - lib/authorization/fallbackRebac.ts                   (shared fallback)
 *   - lib/authorization/AuthorizationService.ts            (provider-agnostic entry point)
 *
 * `canAccess()` now simply delegates to `AuthorizationService.checkAccess()`,
 * which resolves whichever provider is active (Permit.io or PingAuthorize —
 * via AUTH_PROVIDER env var or the Admin Console runtime toggle) and never
 * calls a provider SDK/REST API directly itself.
 *
 * Kept so the ~15 existing call sites across app/api/** did not need to
 * change during the migration. New code should prefer importing
 * `AuthorizationService` directly from "./AuthorizationService".
 *
 * Security: FAIL CLOSED — returns false on any error (enforced inside
 * AuthorizationService).
 */

import type { PermissionAction, PermissionResource, PermitContext, UserRole } from "@/types";
import {
  checkAccess as serviceCheckAccess,
  getLastAuthEngine as serviceGetLastAuthEngine,
  type AuthEngine,
} from "./AuthorizationService";

export type { AuthEngine };

/** Returns which engine handled the last authorization check. */
export function getLastAuthEngine(): AuthEngine {
  return serviceGetLastAuthEngine();
}

/**
 * Check whether a user is allowed to perform an action on a resource.
 *
 * @param userId    - The user's ID (from session / JWT sub)
 * @param action    - The action to check (view, create, update, delete, manage)
 * @param resource  - The resource type (products, orders, quotes, admin_dashboard, ...)
 * @param context   - Optional ABAC context (selectedAccountId, allowedSalesOrgs, persona)
 * @param userRole  - Fallback role if the active provider is not configured
 * @param resourceAttributes - Optional resource instance attributes for
 *                    instance-level ABAC checks, e.g. { sales_org_id: "IA001" }.
 *
 * Usage (server-side Route Handler):
 *   const allowed = await canAccess(userId, "view", "products", { allowedSalesOrgs: [...] })
 *   if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
 */
export async function canAccess(
  userId: string,
  action: PermissionAction,
  resource: PermissionResource,
  context?: PermitContext,
  userRole?: UserRole,
  resourceAttributes?: Record<string, unknown>
): Promise<boolean> {
  return serviceCheckAccess(userId, action, resource, context, userRole, resourceAttributes);
}

