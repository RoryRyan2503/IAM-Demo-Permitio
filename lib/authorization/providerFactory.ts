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

interface FactoryState {
  ping: PingAuthorizeProvider | null;
}

function getState(): FactoryState {
  const g = globalThis as unknown as { __authProviderFactoryState?: FactoryState };
  if (!g.__authProviderFactoryState) {
    g.__authProviderFactoryState = { ping: null };
  }
  return g.__authProviderFactoryState;
}

/** Only "ping" is supported — kept as a function for call-site compatibility. */
export function getActiveProviderName(): AuthProviderName {
  return "ping";
}

/** Get the singleton PingAuthorize provider instance. */
export function getAuthorizationProvider(): AuthorizationProvider {
  const state = getState();
  if (!state.ping) state.ping = new PingAuthorizeProvider();
  return state.ping;
}

/** Get a specific provider by name — only "ping" is valid now. */
export function getProviderByName(_name: AuthProviderName): AuthorizationProvider {
  return getAuthorizationProvider();
}

export function listAvailableProviders(): AuthProviderName[] {
  return ["ping"];
}
