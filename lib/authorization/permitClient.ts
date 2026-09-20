/**
 * Permit.io Client — Centralized Authorization Engine
 *
 * This module initializes the Permit.io SDK singleton.
 * All authorization checks flow through this client.
 *
 * Permit.io architecture:
 *   Frontend → canAccess() → Permit SDK → PDP (Policy Decision Point) → Allow/Deny
 *
 * The PDP can be:
 *   - Permit cloud PDP: https://cloudpdp.api.permit.io (no infrastructure needed)
 *   - Local Docker PDP: http://localhost:7766 (lowest latency, air-gapped)
 *
 * Configure via:
 *   PERMIT_API_KEY  — your Permit.io project API key
 *   PERMIT_PDP_URL  — PDP endpoint URL
 */

type PermitClientLike = {
  check: (...args: unknown[]) => Promise<boolean>;
};

let permitClient: PermitClientLike | null = null;
let isConfigured = false;

/**
 * Return the legacy Permit.io client only if the SDK is actually available.
 * This repo is now PingAuthorize-first, so the default path is graceful
 * fallback RBAC instead of crashing during production builds.
 */
export function getPermitClient(): PermitClientLike | null {
  if (!process.env.PERMIT_API_KEY || process.env.PERMIT_API_KEY.startsWith("permit_key_demo")) {
    if (!isConfigured) {
      console.warn(
        "[Permit.io] PERMIT_API_KEY not configured. " +
          "Authorization checks will use fallback RBAC rules. " +
          "Set PERMIT_API_KEY and PERMIT_PDP_URL in .env.local to enable Permit.io."
      );
      isConfigured = true;
    }
    return null;
  }

  if (!permitClient) {
    try {
      // The Permit.io SDK is intentionally optional in this repo. The app
      // ships with PingAuthorize enabled by default and should not fail build
      // when the package is absent.
      const mod = require("permitio") as { Permit?: new (config: unknown) => PermitClientLike };
      const PermitCtor = mod.Permit;
      if (!PermitCtor) {
        console.warn("[Permit.io] permitio package is not installed in this workspace; legacy Permit checks are disabled.");
        return null;
      }
      permitClient = new PermitCtor({
        token: process.env.PERMIT_API_KEY,
        pdp: process.env.PERMIT_PDP_URL ?? "https://cloudpdp.api.permit.io",
        log: {
          level: process.env.NODE_ENV === "development" ? "info" : "error",
        },
      });
    } catch {
      console.warn("[Permit.io] permitio package is not installed; legacy Permit checks are disabled.");
      return null;
    }
    isConfigured = true;
  }

  return permitClient;
}
