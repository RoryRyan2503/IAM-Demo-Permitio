/**
 * PingAuthorizeProvider — PingAuthorize implementation of AuthorizationProvider
 * ============================================================================
 * Delegates to services/ping-authorize/decisions.ts, which either calls a
 * real PingAuthorize JSON PDP API (`POST {PING_PDP_URL}/governance-engine`)
 * when configured, or evaluates against the local demo policy store so the
 * app works without a live PingAuthorize tenant.
 *
 * See services/ping-authorize/README-CONCEPTS.md (in decisions.ts header) for
 * PingAuthorize PAP/PDP background.
 */

import type { PermitContext } from "@/types";
import { toolBasedRebac } from "../fallbackRebac";
import { evaluateAccess, getPdpConnectivity } from "@/services/ping-authorize/decisions";
import type {
  AuthorizationDecisionDetail,
  AuthorizationProvider,
  AuthorizationSubject,
} from "./AuthorizationProvider";

export class PingAuthorizeProvider implements AuthorizationProvider {
  getProviderName(): string {
    return "pingauthorize";
  }

  async checkAccess(
    subject: AuthorizationSubject,
    resource: string,
    action: string,
    context?: PermitContext,
    resourceAttributes?: Record<string, unknown>
  ): Promise<boolean> {
    const detail = await this.checkAccessDetailed(subject, resource, action, context, resourceAttributes);
    return detail.allowed;
  }

  async checkAccessDetailed(
    subject: AuthorizationSubject,
    resource: string,
    action: string,
    context?: PermitContext,
    resourceAttributes?: Record<string, unknown>
  ): Promise<AuthorizationDecisionDetail> {
    const start = performance.now();
    const requestPayload = {
      domain: "HonEcom",
      service: resource.startsWith("admin_") || resource === "users" || resource === "policy_sets" || resource === "policies"
        ? `Admin.${resource.replace(/(^.|_.)/g, (m) => m.replace("_", "").toUpperCase())}`
        : `Commerce.${resource.replace(/(^.|_.)/g, (m) => m.replace("_", "").toUpperCase())}`,
      identityProvider: "",
      action,
      attributes: {
        role: subject.role,
      },
    };

    try {
      const result = await evaluateAccess({
        subject: {
          id: subject.id,
          role: subject.role,
          persona: subject.persona,
          isSuperUser: subject.isSuperUser,
          attributes: subject.attributes,
        },
        resource: { type: resource, attributes: resourceAttributes ?? {} },
        action,
      });

      return {
        allowed: result.effect === "Permit",
        engine: result.engine,
        request: result.request ?? requestPayload,
        raw: result.raw,
        reason: result.reason ?? `PingAuthorize decision: ${result.effect === "Permit" ? "PERMIT" : "DENY"}`,
        latencyMs: Math.round(performance.now() - start),
      };
    } catch (error) {
      // PDP unreachable, or reachable but INDETERMINATE (no policy Target
      // matched — usually an undeployed/misconfigured branch) — fall back
      // to shared tool-based ReBAC rather than failing open or throwing.
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[PingAuthorizeProvider] evaluateAccess failed (${message}). Falling back to local RBAC.`);
      const allowed = toolBasedRebac(subject.role, action, resource, context, resourceAttributes);
      return {
        allowed,
        engine: "pingauthorize-fallback",
        request: requestPayload,
        reason: "PingAuthorize PDP did not return a usable decision — evaluated via tool-based ReBAC",
        error: message,
        latencyMs: Math.round(performance.now() - start),
      };
    }
  }

  async getConnectivityStatus(): Promise<{ connected: boolean; message?: string }> {
    return getPdpConnectivity();
  }
}
