/**
 * PermitProvider — Permit.io implementation of AuthorizationProvider
 * ============================================================================
 * Wraps the existing Permit.io SDK client (lib/authorization/permitClient.ts).
 * Behavior is unchanged from the original canAccess.ts: attempt a live
 * `permit.check()`, and on PDP unavailability fall back to the shared
 * tool-based ReBAC engine so the demo keeps working without Permit configured.
 */

import type { PermitContext } from "@/types";
import { getPermitClient } from "../permitClient";
import { toolBasedRebac } from "../fallbackRebac";
import type {
  AuthorizationDecisionDetail,
  AuthorizationProvider,
  AuthorizationSubject,
} from "./AuthorizationProvider";

export class PermitProvider implements AuthorizationProvider {
  getProviderName(): string {
    return "permit.io";
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
    try {
      const permit = getPermitClient();

      if (permit) {
        const permitResource = { type: resource, attributes: resourceAttributes ?? {} };
        const userArg = {
          key: subject.id,
          attributes: {
            ...(subject.persona ? { persona: subject.persona } : {}),
            allowedSalesOrgs: (subject.attributes.allowedSalesOrgs as string[]) ?? [],
            selectedAccountId: (subject.attributes.selectedAccountId as string) ?? null,
          },
        };

        try {
          const allowed = await permit.check(userArg, action, permitResource);
          return {
            allowed: Boolean(allowed),
            engine: "permit.io",
            raw: { userArg, action, permitResource, allowed },
            latencyMs: Math.round(performance.now() - start),
          };
        } catch (permitError: unknown) {
          const msg = permitError instanceof Error ? permitError.message : String(permitError);
          console.warn(
            `[PermitProvider] PDP unreachable (${msg.substring(0, 80)}). Falling back to local RBAC.`
          );
          // fall through to local fallback below
        }
      }

      const allowed = toolBasedRebac(subject.role, action, resource, context, resourceAttributes);
      return {
        allowed,
        engine: "permit.io-fallback",
        reason: "Permit.io not configured or PDP unreachable — evaluated via tool-based ReBAC",
        latencyMs: Math.round(performance.now() - start),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[PermitProvider] Authorization check failed:", error);
      return {
        allowed: false,
        engine: "permit.io-error",
        error: message,
        latencyMs: Math.round(performance.now() - start),
      };
    }
  }

  async getConnectivityStatus(): Promise<{ connected: boolean; message?: string }> {
    const permit = getPermitClient();
    if (!permit) {
      return { connected: false, message: "PERMIT_API_KEY not configured — using local fallback RBAC" };
    }
    try {
      // A cheap check() call doubles as a connectivity probe.
      await permit.check({ key: "__connectivity_probe__" }, "view", { type: "products" });
      return { connected: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { connected: false, message };
    }
  }
}
