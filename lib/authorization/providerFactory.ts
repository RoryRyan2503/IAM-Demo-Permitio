/**
 * Provider Factory — resolves the active AuthorizationProvider
 * ============================================================================
 * PingAuthorize is the only supported authorization backend (the Permit.io
 * SDK/provider was removed). Kept as the single indirection point so
 * AuthorizationService never instantiates a provider class itself.
 */

import { PingAuthorizeProvider } from "./providers/PingAuthorizeProvider";
import type { AuthorizationProvider } from "./providers/AuthorizationProvider";

export type AuthProviderName = "ping";

// Keep executable provider code module-scoped so hot reloads replace stale implementations.
let ping: PingAuthorizeProvider | null = null;

/** Only "ping" is supported — kept as a function for call-site compatibility. */
export function getActiveProviderName(): AuthProviderName {
  return "ping";
}

/** Get the singleton PingAuthorize provider instance. */
export function getAuthorizationProvider(): AuthorizationProvider {
  if (!ping) ping = new PingAuthorizeProvider();
  return ping;
}

/** Get a specific provider by name — only "ping" is valid now. */
export function getProviderByName(_name: AuthProviderName): AuthorizationProvider {
  return getAuthorizationProvider();
}

export function listAvailableProviders(): AuthProviderName[] {
  return ["ping"];
}
