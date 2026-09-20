import { getCurrentTrace, type UpstreamCall } from "@/lib/debug/traceStore";

/**
 * PingAuthorize low-level HTTP client
 * ============================================================================
 * Thin wrapper around fetch() for talking to a real PingAuthorize deployment:
 *   - PAP (Policy Administration Point) — policy editor REST APIs, base URL
 *     from PING_PAP_URL.
 *   - PDP (Policy Decision Point) — JSON PDP API, base URL from PING_PDP_URL.
 *
 * Auth: PingAuthorize's Policy Manager API documents three auth modes:
 *   - "None" — a plain `x-user-id: <userId>` header identifying the acting
 *     user (no credential validation). This is the mode confirmed working
 *     against the real tenant and is preferred whenever PING_USER_ID is set.
 *   - OIDC — `Authorization: Bearer <token>` (not wired up here; add if the
 *     tenant is switched to OIDC).
 *   - LDAP — client credentials, implemented here as HTTP Basic auth
 *     (PING_USERNAME / PING_PASSWORD) as a fallback for LDAP-backed tenants.
 * `x-user-id` takes precedence over Basic auth when both are configured.
 *
 * Handles: authentication headers, retries with exponential backoff for
 * transient failures (network errors, 502/503/504), structured logging, and
 * typed errors.
 */

export class PingAuthorizeError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = "PingAuthorizeError";
  }
}

export interface PingRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  headers?: Record<string, string>;
  /** Number of retry attempts for transient failures. Default 2. */
  retries?: number;
  /**
   * Per-attempt connect/response timeout in ms. Kept short (well under
   * undici's 10s default connect timeout) so an unreachable PDP/PAP host
   * falls back to the local demo evaluator quickly instead of hanging the
   * request for 20-30s across retries. Default 5000.
   */
  timeoutMs?: number;
  /**
   * X-Respond-With header value(s). Kept as an opt-in escape hatch for
   * verbosity-control conventions seen elsewhere in PingAuthorize's API
   * family; the grounded JSON PDP API request/response schema (see
   * decisions.ts) does not reference this header, so it is NOT sent by
   * default and should only be used if your specific deployment supports it.
   */
  respondWith?: string[];
}

const RETRYABLE_STATUS = new Set([502, 503, 504]);

/** Detects unfilled `<...>` placeholder values left over from .env.local.example. */
function isPlaceholder(value: string | undefined): boolean {
  return !value || /^<.*>$/.test(value.trim());
}

/** `x-user-id` header value for the "None" auth mode — confirmed real-tenant auth. */
function getUserIdHeader(): string | undefined {
  const value = process.env.PING_USER_ID;
  return isPlaceholder(value) ? undefined : value;
}

function getBasicAuthHeader(): string | undefined {
  const username = process.env.PING_USERNAME;
  const password = process.env.PING_PASSWORD;
  if (!username || !password) return undefined;
  const encoded = Buffer.from(`${username}:${password}`).toString("base64");
  return `Basic ${encoded}`;
}

/**
 * The branch (ID or name) that all Policy Manager CRUD calls operate
 * against. Required as a `branch` query param by nearly every Policy
 * Manager endpoint (PolicySets/Policies/Rules/Targets/Statements).
 */
export function getBranchId(): string | undefined {
  const value = process.env.PING_BRANCH_ID;
  return isPlaceholder(value) ? undefined : value;
}

export function requireBranchId(): string {
  const branch = getBranchId();
  if (!branch) {
    throw new PingAuthorizeError(
      "PING_BRANCH_ID is not configured (or is still the `<your-branch-id>` placeholder) — required as the `branch` query param for PingAuthorize Policy Manager calls. Set it in .env.local."
    );
  }
  return branch;
}

/**
 * True when the Policy Manager (PolicySets/Policies/Rules CRUD) can actually
 * be called against the real tenant — i.e. PING_PAP_URL AND a real (non-
 * placeholder) PING_BRANCH_ID are both set. `isPapConfigured()` alone is not
 * sufficient, since every Policy Manager call also requires a branch.
 */
export function isPolicyManagerConfigured(): boolean {
  return isPapConfigured() && Boolean(getBranchId());
}

/** Human-readable explanation of what's missing, or undefined if fully configured (or intentionally in demo mode). */
export function getPolicyManagerConfigWarning(): string | undefined {
  if (!isPapConfigured()) return undefined; // demo mode — not a misconfiguration
  const missing: string[] = [];
  if (!getBranchId()) missing.push("PING_BRANCH_ID");
  if (!getUserIdHeader() && !getBasicAuthHeader()) missing.push("PING_USER_ID (or PING_USERNAME/PING_PASSWORD)");
  if (missing.length === 0) return undefined;
  return `PING_PAP_URL is set but ${missing.join(" and ")} still need real values in .env.local — Policy Manager calls will fail until then.`;
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Low-level request helper shared by the PAP (policy editor) and PDP
 * (decisions) clients. `baseUrl` is passed in explicitly since PAP and PDP
 * are configured as separate endpoints (PING_PAP_URL vs PING_PDP_URL).
 */
export async function pingRequest<T>(
  baseUrl: string,
  path: string,
  options: PingRequestOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {}, retries = 2, timeoutMs = 5000, respondWith } = options;

  const activeTrace = getCurrentTrace();
  const requestBodyText = body !== undefined ? JSON.stringify(body) : undefined;
  const upstreamCall: UpstreamCall = {
    service: "PingAuthorize",
    method,
    url: `${baseUrl.replace(/\/$/, "")}${path}`,
    requestBody: requestBodyText ? requestBodyText.substring(0, 4000) : undefined,
  };
  activeTrace?.upstreamCalls.push(upstreamCall);

  const userIdHeader = getUserIdHeader();
  const authHeader = getBasicAuthHeader();
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    // Prefer the confirmed-working x-user-id ("None" auth) mode; fall back to Basic.
    ...(userIdHeader ? { "x-user-id": userIdHeader } : authHeader ? { Authorization: authHeader } : {}),
    ...headers,
  };
  if (respondWith?.length) {
    // One header per requested view, per the JSON PDP API's X-Respond-With convention
    requestHeaders["X-Respond-With"] = respondWith.join(", ");
  }

  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const startedAt = Date.now();
      const res = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const durationMs = Date.now() - startedAt;
      upstreamCall.durationMs = durationMs;
      upstreamCall.status = res.status;

      let responseText: string | undefined;
      if (res.status === 204) {
        responseText = "";
      } else {
        try {
          responseText = await res.text();
        } catch {
          responseText = undefined;
        }
      }

      if (responseText) {
        try {
          const parsed = JSON.parse(responseText);
          upstreamCall.responseBody = JSON.stringify(parsed, null, 2).substring(0, 4000);
        } catch {
          upstreamCall.responseBody = responseText.substring(0, 4000);
        }
      }

      if (!res.ok) {
        const errorBody = responseText ?? undefined;
        if (RETRYABLE_STATUS.has(res.status) && attempt < retries) {
          console.warn(`[PingAuthorize] ${method} ${path} → ${res.status}, retrying (attempt ${attempt + 1})`);
          await delay(200 * 2 ** attempt);
          continue;
        }
        upstreamCall.error = `HTTP ${res.status}`;
        throw new PingAuthorizeError(`PingAuthorize API error: ${res.status} ${res.statusText}`, res.status, errorBody);
      }

      if (res.status === 204) return undefined as T;
      return JSON.parse(responseText ?? "null") as T;
    } catch (error) {
      lastError = controller.signal.aborted
        ? new Error(`request timed out after ${timeoutMs}ms`)
        : error;
      upstreamCall.error = lastError instanceof Error ? lastError.message : String(lastError);
      if (error instanceof PingAuthorizeError) throw error;
      // Network-level error (DNS, connection refused, TLS, timeout) — retry if attempts remain
      if (attempt < retries) {
        console.warn(`[PingAuthorize] ${method} ${path} network error, retrying (attempt ${attempt + 1}):`, lastError);
        await delay(200 * 2 ** attempt);
        continue;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new PingAuthorizeError(`PingAuthorize request failed after retries: ${message}`);
}

export function isPapConfigured(): boolean {
  return Boolean(process.env.PING_PAP_URL);
}

export function isPdpConfigured(): boolean {
  return Boolean(process.env.PING_PDP_URL);
}

export function getPapBaseUrl(): string {
  return process.env.PING_PAP_URL ?? "";
}

export function getPdpBaseUrl(): string {
  return process.env.PING_PDP_URL ?? "";
}
