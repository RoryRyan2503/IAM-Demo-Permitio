/**
 * PingAuthorizeProvider — PingAuthorize implementation of AuthorizationProvider
 * ============================================================================
 * Delegates to services/ping-authorize/decisions.ts, which either calls a
 * real PingAuthorize JSON PDP API (`POST {PING_PDP_URL}`)
 * when configured, or evaluates against the local demo policy store so the
 * app works without a live PingAuthorize tenant.
 *
 * See services/ping-authorize/README-CONCEPTS.md (in decisions.ts header) for
 * PingAuthorize PAP/PDP background.
 */

import type { PermitContext } from "@/types";
import { evaluateAccess, getPdpConnectivity, toTrustFrameworkRequest } from "@/services/ping-authorize/decisions";
import { AuthorizationUnavailableError } from "./AuthorizationProvider";
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
    const requestPayload = toTrustFrameworkRequest({
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
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[PingAuthorizeProvider] PDP decision unavailable (${message}). No local authorization substituted.`);
      throw new AuthorizationUnavailableError();
    }
  }

  async getConnectivityStatus(): Promise<{ connected: boolean; message?: string }> {
    return getPdpConnectivity();
  }
}
