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

import { Permit } from "permitio";

let permitClient: Permit | null = null;
let isConfigured = false;

/**
 * Get the Permit.io client singleton.
 * Lazily initialized on first call.
 *
 * Returns null if PERMIT_API_KEY is not configured (demo/dev mode).
 */
export function getPermitClient(): Permit | null {
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
    permitClient = new Permit({
      token: process.env.PERMIT_API_KEY,
      pdp: process.env.PERMIT_PDP_URL ?? "https://cloudpdp.api.permit.io",
      // Log level: "debug" for development, "error" for production
      log: {
        level: process.env.NODE_ENV === "development" ? "info" : "error",
      },
    });
    isConfigured = true;
  }

  return permitClient;
}
