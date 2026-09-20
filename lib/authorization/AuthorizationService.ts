/**
 * AuthorizationService — THE single entry point for all authorization checks
 * ============================================================================
 * Application code (API routes, server components) must call
 * `AuthorizationService.checkAccess(...)` — never a provider class, the
 * Permit SDK, or a PingAuthorize REST endpoint directly.
 *
 *   Frontend
 *      ↓
 *   AuthorizationService.checkAccess()
 *      ↓
 *   Provider Factory  (env AUTH_PROVIDER or runtime Admin Console toggle)
 *      ↓
 *   PermitProvider  /  PingAuthorizeProvider
 *
 * Responsibilities beyond "ask the provider":
 *   - Provider resolution (via providerFactory) — switching providers never
 *     requires a code change in callers.
 *   - Short-TTL decision caching (decisionCache.ts).
 *   - Audit logging of every decision (auditLog.ts).
 *   - Fail-closed on unexpected errors.
 *
 * Signature note: kept close to the original `canAccess(userId, action,
 * resource, context?, userRole?, resourceAttributes?)` signature (rather than
 * the `checkAccess(subject, resource, action, context)` shape used at the
 * AuthorizationProvider interface level) so the ~15 existing call sites across
 * the app's API routes did not need to change during the migration. The
 * subject object required by providers is built internally via `buildSubject`.
 */

import type { PermissionAction, PermissionResource, PermitContext, UserRole } from "@/types";
import { buildSubject, type AuthorizationDecisionDetail } from "./providers/AuthorizationProvider";
import { getAuthorizationProvider, getProviderByName, type AuthProviderName } from "./providerFactory";
import { buildCacheKey, getCached, setCached } from "./decisionCache";
import { recordDecision } from "./auditLog";

export type AuthEngine = string;

let _lastAuthEngine: AuthEngine = "unknown";

/** Returns which engine handled the most recent checkAccess() call. */
export function getLastAuthEngine(): AuthEngine {
  return _lastAuthEngine;
}

export interface CheckAccessOptions {
  /** Skip the decision cache (used by the Decision Testing Console for fresh reads) */
  skipCache?: boolean;
  /** Resource instance attributes for instance-level ABAC (e.g. { sales_org_id }) */
  resourceAttributes?: Record<string, unknown>;
}

function toPingService(resource: string): string {
  const formatted = resource.replace(/(^.|_.)/g, (m) => m.replace("_", "").toUpperCase());
  const isAdminResource =
    resource.startsWith("admin_") || resource === "users" || resource === "policy_sets" || resource === "policies";
  return isAdminResource ? `Admin.${formatted}` : `Commerce.${formatted}`;
}

function buildPingRequestSnapshot(role: string, action: string, resource: string) {
  return {
    domain: "HonEcom",
    service: toPingService(resource),
    identityProvider: "",
    action,
    attributes: {
      role,
    },
  };
}

function normalizeReason(detail: AuthorizationDecisionDetail): string | undefined {
  if (detail.reason) return detail.reason;
  if (detail.error) return detail.error;
  return `PingAuthorize decision: ${detail.allowed ? "PERMIT" : "DENY"}`;
}

/**
 * Check whether a user is allowed to perform an action on a resource, using
 * whichever authorization provider is currently active.
 */
export async function checkAccess(
  userId: string,
  action: PermissionAction | string,
  resource: PermissionResource | string,
  context?: PermitContext,
  userRole?: UserRole,
  resourceAttributes?: Record<string, unknown>
): Promise<boolean> {
  const provider = getAuthorizationProvider();
  const cacheKey = buildCacheKey(provider.getProviderName(), userId, action, resource, context, resourceAttributes);

  const cached = getCached(cacheKey);
  if (cached !== undefined) {
    _lastAuthEngine = provider.getProviderName();
    return cached;
  }

  try {
    const subject = buildSubject(userId, userRole ?? "viewer", context);
    const detail = await provider.checkAccessDetailed(subject, resource, action, context, resourceAttributes);
    const actionText = String(action);
    const resourceText = String(resource);
    const requestSnapshot =
      detail.request ??
      (detail.engine.startsWith("pingauthorize")
        ? buildPingRequestSnapshot(subject.role, actionText, resourceText)
        : undefined);
    const reason = detail.engine.startsWith("pingauthorize") ? normalizeReason(detail) : detail.reason;

    _lastAuthEngine = detail.engine;
    setCached(cacheKey, detail.allowed);

    recordDecision({
      provider: provider.getProviderName(),
      engine: detail.engine,
      userId,
      userRole: subject.role,
      action: actionText,
      resource: resourceText,
      decision: detail.allowed,
      latencyMs: detail.latencyMs,
      reason,
      error: detail.error,
      request: requestSnapshot,
      response: detail.raw,
    });

    return detail.allowed;
  } catch (error) {
    console.error("[AuthorizationService] checkAccess failed:", error);
    _lastAuthEngine = "error";
    return false; // fail closed
  }
}

/**
 * Full decision detail (engine, latency, raw provider response) — used by the
 * Decision Testing Console. Optionally targets a *specific* provider rather
 * than the currently active one, so both engines can be compared side by side.
 */
export async function checkAccessDetailed(
  userId: string,
  action: PermissionAction | string,
  resource: PermissionResource | string,
  context?: PermitContext,
  userRole?: UserRole,
  providerName?: AuthProviderName
): Promise<AuthorizationDecisionDetail & { providerName: string }> {
  const provider = providerName ? getProviderByName(providerName) : getAuthorizationProvider();
  const subject = buildSubject(userId, userRole ?? "viewer", context);
  const detail = await provider.checkAccessDetailed(subject, resource, action, context);
  const actionText = String(action);
  const resourceText = String(resource);
  const requestSnapshot =
    detail.request ??
    (detail.engine.startsWith("pingauthorize")
      ? buildPingRequestSnapshot(subject.role, actionText, resourceText)
      : undefined);
  const reason = detail.engine.startsWith("pingauthorize") ? normalizeReason(detail) : detail.reason;

  recordDecision({
    provider: provider.getProviderName(),
    engine: detail.engine,
    userId,
    userRole: subject.role,
    action: actionText,
    resource: resourceText,
    decision: detail.allowed,
    latencyMs: detail.latencyMs,
    reason,
    error: detail.error,
    request: requestSnapshot,
    response: detail.raw,
  });

  return { ...detail, providerName: provider.getProviderName() };
}

export const AuthorizationService = {
  checkAccess,
  checkAccessDetailed,
  getLastAuthEngine,
};
