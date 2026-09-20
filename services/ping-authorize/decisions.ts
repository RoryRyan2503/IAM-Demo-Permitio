/**
 * PingAuthorize Decisions — Policy Decision Point (PDP) integration
 * ============================================================================
 * PINGAUTHORIZE CONCEPTS — grounded in the PingAuthorize Server
 * Administration Guide (JSON PDP API request/response format), verified
 * verbatim by the user, September 2026:
 *
 * - Policy Decision Point (PDP): evaluates authorization requests in real
 *   time against published policies and returns a decision via the
 *   "JSON PDP API": `POST {baseUrl}/governance-engine` for a single decision
 *   (this app only uses the single-request form; the API also supports a
 *   `{ "requests": [...] }` batch form returning `{ "responses": [...] }`,
 *   in the same order as the requests).
 * - PingAuthorize models authorization around a "Trust Framework" of named
 *   attributes rather than a nested subject/resource/action/environment
 *   object. The JSON PDP API request has exactly five top-level fields, all
 *   optional strings except `attributes`:
 *     domain           — coarse business/organizational grouping (e.g. "Sales.Asia Pacific")
 *     action           — the operation being performed (e.g. "Retrieve")
 *     service          — the application/service being accessed (e.g. "Mobile.Landing page")
 *     identityProvider — source of the caller's identity (e.g. "Social Networks.Spacebook")
 *     attributes       — REQUIRED (may be `{}`) flat `map<string, string>` of
 *                        "Other Attributes". Each key MUST match the name of
 *                        a Trust Framework attribute configured in the PAP
 *                        GUI with a "Request resolver" — there is no nested
 *                        structure on the wire.
 * - The response contains `decision` ("PERMIT" | "DENY", uppercase),
 *   `authorized` (boolean — the definitive allow/deny to enforce),
 *   `statements[]` (advice/obligations the calling Policy Enforcement Point
 *   — this app — is responsible for applying; not implemented here), and a
 *   `status` block (`code`/`messages`/`errors`).
 *
 * See `toTrustFrameworkRequest()` below for how this app's internal
 * subject/resource/action model (used everywhere else in lib/authorization)
 * is flattened into this Domain/Action/Service/IdentityProvider + attributes
 * shape before being sent to a real PDP. When PING_PDP_URL is not
 * configured, decisions are evaluated locally against the demo policy store
 * (./demoStore.ts) using the same Permit/Deny, deny-overrides semantics a
 * real PDP would apply — enough to power the Admin Console's Decision
 * Testing screen without a live tenant. The local evaluator works on the
 * original nested DecisionRequest shape directly since it never goes over
 * the wire.
 */

import { pingRequest, isPdpConfigured, getPdpBaseUrl } from "./client";
import { listPoliciesDemo } from "./demoStore";
import type { DecisionRequest, DecisionResult, PdpRequest, PdpEnvelope, PdpResponse, DemoPolicy, PolicyCondition } from "./types";

// ---------------------------------------------------------------------------
// Real PDP call
// ---------------------------------------------------------------------------

/** e.g. "admin_dashboard" -> "AdminDashboard", "products" -> "Products" */
function toPascalCase(key: string): string {
  return key
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

const ADMIN_RESOURCE_TYPES = new Set(["admin_dashboard", "users", "policy_sets", "policies"]);

/**
 * Flattens this app's internal DecisionRequest (subject/resource/action/
 * environment) into the actual PingAuthorize JSON PDP API payload shape:
 *
 *   {
 *     "domain": "HonEcom",
 *     "service": "Commerce.Products",
 *     "identityProvider": "",
 *     "action": "view",
 *     "attributes": {
 *       "role": "admin"
 *     }
 *   }
 *
 * `domain` is always the constant "HonEcom". `service` is namespaced per
 * page (`Commerce.Products`, `Commerce.Cart`, `Commerce.Orders`, ... or
 * `Admin.*` for admin-console resources). `attributes` intentionally carries
 * only `role` — no other subject/resource attributes are sent for the
 * current PingAuthorize integration.
 */
export function toTrustFrameworkRequest(request: DecisionRequest): PdpRequest {
  const { subject, resource, action } = request;

  const service = ADMIN_RESOURCE_TYPES.has(resource.type)
    ? `Admin.${toPascalCase(resource.type)}`
    : `Commerce.${toPascalCase(resource.type)}`;

  return {
    domain: "HonEcom",
    service,
    identityProvider: "",
    action,
    attributes: {
      role: subject.role,
    },
  };
}

async function evaluateAccessRemote(request: DecisionRequest): Promise<DecisionResult> {
  const body = toTrustFrameworkRequest(request);

  const res = await pingRequest<PdpResponse>(getPdpBaseUrl(), "/governance-engine", {
    method: "POST",
    body,
    // Decisions are evaluated many times per page load — fail fast (no
    // retries, short timeout) so an unreachable PDP falls back to the local
    // demo evaluator quickly instead of stalling the request for 20-30s.
    retries: 0,
    timeoutMs: 3000,
  });

  // INDETERMINATE/NOT_APPLICABLE mean the PDP is reachable but no policy's
  // Target matched this request (commonly: policies edited in a branch but
  // never deployed/published to the environment the PDP evaluates, or a
  // Domain/Service/Action mismatch). Treat both as a distinct failure — NOT
  // a real Deny — so the caller falls back to the role/tool-based ReBAC
  // safety net instead of the persona-oriented local demo store (which
  // models different scenarios and would mask this).
  if (res.decision === "INDETERMINATE" || res.decision === "NOT_APPLICABLE") {
    throw new Error(
      `PingAuthorize PDP returned ${res.decision} — no policy Target matched this request. Check that the policy/branch is deployed/published, and that Domain/Service/Action targets match exactly.`
    );
  }

  const advice = res.statements?.map((s) => s.name).filter(Boolean).join("; ");
  // Real API returns `authorised` (British spelling) — `authorized` kept as a fallback.
  const authorised = res.authorised ?? res.authorized ?? false;
  return {
    effect: authorised || res.decision === "PERMIT" ? "Permit" : "Deny",
    engine: "pingauthorize",
    reason: advice || undefined,
    request: body,
    raw: res,
  };
}

// ---------------------------------------------------------------------------
// Local demo evaluator (deny-overrides combining algorithm, default deny)
// ---------------------------------------------------------------------------

function resolveAttribute(path: string, request: DecisionRequest): unknown {
  if (path === "action") return request.action;

  const parts = path.split(".");
  const rootKey = parts[0] as "subject" | "resource" | "environment";
  let current: unknown = request[rootKey];

  for (let i = 1; i < parts.length; i++) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[parts[i]];
  }
  return current;
}

function conditionMatches(condition: PolicyCondition, request: DecisionRequest): boolean {
  const actual = resolveAttribute(condition.attributePath, request);

  switch (condition.operator) {
    case "equals":
      return actual === condition.value;
    case "not_equals":
      return actual !== condition.value;
    case "exists":
      return actual !== undefined && actual !== null;
    case "in":
      return Array.isArray(condition.value) && typeof actual === "string" && condition.value.includes(actual);
    case "contains":
      if (Array.isArray(actual)) return actual.includes(condition.value as string);
      return false;
    default:
      return false;
  }
}

function policyMatches(policy: DemoPolicy, request: DecisionRequest): boolean {
  const { subject, resource, action, environment } = policy.conditions;
  const groups = [subject, resource, action, environment];
  return groups.every((group) => group.every((c) => conditionMatches(c, request)));
}

function evaluateAccessLocal(request: DecisionRequest): DecisionResult {
  const policies = listPoliciesDemo().filter((p) => p.status === "published");

  // Deny-overrides: an explicit Deny match short-circuits to Deny.
  const denyMatch = policies.find((p) => p.effect === "Deny" && policyMatches(p, request));
  if (denyMatch) {
    return {
      effect: "Deny",
      engine: "pingauthorize-demo",
      reason: `Denied by policy "${denyMatch.name}" (${denyMatch.id})`,
      matchedPolicyId: denyMatch.id,
      request: request,
    };
  }

  const permitMatch = policies.find((p) => p.effect === "Permit" && policyMatches(p, request));
  if (permitMatch) {
    return {
      effect: "Permit",
      engine: "pingauthorize-demo",
      reason: `Permitted by policy "${permitMatch.name}" (${permitMatch.id})`,
      matchedPolicyId: permitMatch.id,
      request: request,
    };
  }

  return {
    effect: "Deny",
    engine: "pingauthorize-demo",
    reason: "No applicable policy matched — default deny",
    request: request,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function evaluateAccess(request: DecisionRequest): Promise<DecisionResult> {
  if (isPdpConfigured()) {
    // Let failures (including INDETERMINATE) propagate to the caller
    // (PingAuthorizeProvider), which applies the role/tool-based ReBAC
    // fallback — the demo persona store below models unrelated scenarios
    // and would silently mask a misconfigured/undeployed real tenant.
    return evaluateAccessRemote(request);
  }
  return evaluateAccessLocal(request);
}

export async function getPdpConnectivity(): Promise<{ connected: boolean; message?: string }> {
  if (!isPdpConfigured()) {
    return { connected: false, message: "PING_PDP_URL not configured — using local demo policy evaluator" };
  }
  try {
    await evaluateAccessRemote({
      subject: { id: "__connectivity_probe__", role: "viewer", attributes: {} },
      resource: { type: "products", attributes: {} },
      action: "view",
    });
    return { connected: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { connected: false, message };
  }
}
