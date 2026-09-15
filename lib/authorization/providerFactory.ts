/**
 * Provider Factory — resolves the active AuthorizationProvider
 * ============================================================================
 * Selection order:
 *   1. Runtime override (set via the Admin Console "Provider" panel —
 *      POST /api/admin/auth-provider). Stored in-memory (globalThis, survives
 *      HMR in dev). Resets on server restart — by design, this is a demo
 *      toggle, not a persisted config store.
 *   2. AUTH_PROVIDER environment variable ("permit" | "ping").
 *   3. Default: "permit".
 *
 * This is the ONLY place that decides which provider instance is active.
 * AuthorizationService calls getProvider() and never instantiates a provider
 * class itself — classic Factory pattern + a light form of DI (providers are
 * constructed once and reused as singletons).
 */

import { PermitProvider } from "./providers/PermitProvider";
import { PingAuthorizeProvider } from "./providers/PingAuthorizeProvider";
import type { AuthorizationProvider } from "./providers/AuthorizationProvider";

export type AuthProviderName = "permit" | "ping";

const VALID_PROVIDERS: AuthProviderName[] = ["permit", "ping"];

interface FactoryState {
  runtimeOverride: AuthProviderName | null;
  permit: PermitProvider | null;
  ping: PingAuthorizeProvider | null;
}

function getState(): FactoryState {
  const g = globalThis as unknown as { __authProviderFactoryState?: FactoryState };
  if (!g.__authProviderFactoryState) {
    g.__authProviderFactoryState = { runtimeOverride: null, permit: null, ping: null };
  }
  return g.__authProviderFactoryState;
}

function envDefault(): AuthProviderName {
  const raw = (process.env.AUTH_PROVIDER ?? "permit").toLowerCase();
  return raw === "ping" ? "ping" : "permit";
}

/** Which provider is currently active (runtime override wins over env var). */
export function getActiveProviderName(): AuthProviderName {
  const state = getState();
  return state.runtimeOverride ?? envDefault();
}

/** Set an in-memory runtime override (used by the Admin Console toggle). Pass null to clear. */
export function setRuntimeProviderOverride(name: AuthProviderName | null): void {
  if (name !== null && !VALID_PROVIDERS.includes(name)) {
    throw new Error(`Invalid provider "${name}". Must be one of: ${VALID_PROVIDERS.join(", ")}`);
  }
  getState().runtimeOverride = name;
}

export function getRuntimeProviderOverride(): AuthProviderName | null {
  return getState().runtimeOverride;
}

/** Get the singleton instance for the currently active provider. */
export function getAuthorizationProvider(): AuthorizationProvider {
  const state = getState();
  const active = getActiveProviderName();

  if (active === "ping") {
    if (!state.ping) state.ping = new PingAuthorizeProvider();
    return state.ping;
  }

  if (!state.permit) state.permit = new PermitProvider();
  return state.permit;
}

/** Get a specific provider by name regardless of which is "active" — used by the
 *  side-by-side Decision Testing Console to run both providers at once. */
export function getProviderByName(name: AuthProviderName): AuthorizationProvider {
  const state = getState();
  if (name === "ping") {
    if (!state.ping) state.ping = new PingAuthorizeProvider();
    return state.ping;
  }
  if (!state.permit) state.permit = new PermitProvider();
  return state.permit;
}

export function listAvailableProviders(): AuthProviderName[] {
  return VALID_PROVIDERS;
}
