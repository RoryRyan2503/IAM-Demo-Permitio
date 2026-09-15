/**
 * Decision cache — short-TTL in-memory cache for authorization decisions.
 * ============================================================================
 * Authorization checks are called frequently for the same
 * (provider, user, action, resource, context) tuple within a single page
 * load (e.g. /api/auth/permissions checks 10 permissions back-to-back).
 * A short TTL cache avoids redundant PDP round-trips without risking stale
 * decisions across meaningful state changes (account switch, permission
 * change) since the TTL is intentionally very small.
 *
 * Uses globalThis so it survives Next.js dev-mode HMR reloads.
 */

interface CacheEntry {
  value: boolean;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 3_000;

function getStore(): Map<string, CacheEntry> {
  const g = globalThis as unknown as { __authDecisionCache?: Map<string, CacheEntry> };
  if (!g.__authDecisionCache) g.__authDecisionCache = new Map();
  return g.__authDecisionCache;
}

export function buildCacheKey(
  providerName: string,
  userId: string,
  action: string,
  resource: string,
  context?: unknown,
  resourceAttributes?: unknown
): string {
  return JSON.stringify([providerName, userId, action, resource, context ?? null, resourceAttributes ?? null]);
}

export function getCached(key: string): boolean | undefined {
  const store = getStore();
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

export function setCached(key: string, value: boolean, ttlMs = DEFAULT_TTL_MS): void {
  getStore().set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function clearDecisionCache(): void {
  getStore().clear();
}
