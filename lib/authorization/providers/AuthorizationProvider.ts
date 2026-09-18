/**
 * AuthorizationProvider — pluggable authorization engine interface
 * ============================================================================
 * This is the contract an authorization backend (PingAuthorize; the Permit.io
 * SDK was removed, future engines like OPA/OpenFGA/Cedar could be added)
 * must implement.
 *
 * ARCHITECTURAL RULE: nothing outside `lib/authorization/**` and
 * `services/ping-authorize/**` may call a PingAuthorize REST endpoint
 * directly. All application code goes through `AuthorizationService.checkAccess()`
 * (see ../AuthorizationService.ts), which resolves the active provider via
 * the provider factory and delegates to it.
 *
 *   Frontend / API routes
 *        └── AuthorizationService.checkAccess(...)
 *              └── ProviderFactory.getProvider()
 *                    └── PingAuthorizeProvider     (PingAuthorize PDP)
 */

import type { PermissionAction, PermissionResource, PermitContext, User, UserRole } from "@/types";

/**
 * Minimal "subject" shape passed to providers. Built from the app's full
 * `User` + request-scoped `PermitContext` — deliberately small so provider
 * implementations don't need to know about CRM/account internals.
 */
export interface AuthorizationSubject {
  id: string;
  role: UserRole;
  persona?: string;
  isSuperUser?: boolean;
  /** ABAC attributes available to the policy engine (sales orgs, tool grants, etc.) */
  attributes: Record<string, unknown>;
}

export interface AuthorizationDecisionDetail {
  allowed: boolean;
  /** Which engine actually produced the decision (may differ from the requested provider on fallback) */
  engine: string;
  /** Provider-specific raw response, useful for the decision testing console */
  raw?: unknown;
  /** Human-readable reason, e.g. which rule/condition matched */
  reason?: string;
  latencyMs: number;
  error?: string;
}

export interface AuthorizationProvider {
  /**
   * Evaluate whether `subject` may perform `action` on `resource`.
   *
   * @param subject   The authenticated user + ABAC attributes
   * @param resource  Resource type being accessed (e.g. "products")
   * @param action    Action being performed (e.g. "view")
   * @param context   Optional request-scoped ABAC context (account, sales orgs, persona, ...)
   */
  checkAccess(
    subject: AuthorizationSubject,
    resource: string,
    action: string,
    context?: PermitContext,
    resourceAttributes?: Record<string, unknown>
  ): Promise<boolean>;

  /**
   * Same as checkAccess but returns full decision detail (engine used, latency,
   * raw provider response). Used by the Decision Testing Console. Providers
   * that can't cheaply expose this may just wrap checkAccess().
   */
  checkAccessDetailed(
    subject: AuthorizationSubject,
    resource: string,
    action: string,
    context?: PermitContext,
    resourceAttributes?: Record<string, unknown>
  ): Promise<AuthorizationDecisionDetail>;

  getProviderName(): string;

  /** Lightweight connectivity/health check surfaced in the Admin Console Overview. */
  getConnectivityStatus(): Promise<{ connected: boolean; message?: string }>;
}

/** Build an AuthorizationSubject from the app's User + PermitContext (helper for callers). */
export function buildSubject(
  userId: string,
  role: UserRole,
  context?: PermitContext
): AuthorizationSubject {
  return {
    id: userId,
    role,
    persona: context?.persona,
    isSuperUser: context?.isSuperUser,
    attributes: {
      allowedSalesOrgs: context?.allowedSalesOrgs ?? [],
      selectedAccountId: context?.selectedAccountId ?? null,
      activeSalesArea: context?.activeSalesArea ?? null,
      toolIds: context?.toolIds ?? [],
    },
  };
}

export type { PermissionAction, PermissionResource, PermitContext, User };
