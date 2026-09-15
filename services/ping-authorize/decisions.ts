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
import type { DecisionRequest, DecisionResult, PdpRequest, PdpResponse, DemoPolicy, PolicyCondition } from "./types";

// ---------------------------------------------------------------------------
// Real PDP call
// ---------------------------------------------------------------------------

function toAttributeValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.join(",");
  return String(value);
}

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
 * environment) into the real PingAuthorize JSON PDP API request shape
 * (Domain/Action/Service/IdentityProvider + flat string attributes map).
 *
 * Mapping used by this app (see MIGRATION.md for the full Trust Framework
 * design + PAP setup steps):
 *   - `service`          <- resource type, namespaced e.g. "Commerce.Products"
 *                           or "Admin.PolicySets" for admin-console resources
 *   - `action`           <- passed through as-is (view, view_pricing, create, ...)
 *   - `domain`           <- subject persona, namespaced e.g. "Persona.Procurement",
 *                           falling back to "Role.<Role>" if no persona
 *   - `identityProvider` <- constant "PingOne.HonDemo" (this app authenticates
 *                           via Ping Identity OIDC — see lib/auth/pingConfig.ts)
 *   - `attributes`       <- flat "Subject.*" / "Resource.*" / "Environment.*"
 *                           string attributes for fine-grained ABAC conditions
 *                           (each must be configured as a Trust Framework
 *                           attribute with a Request resolver in the PAP)
 */
export function toTrustFrameworkRequest(request: DecisionRequest): PdpRequest {
  const { subject, resource, action, environment } = request;

  const service = ADMIN_RESOURCE_TYPES.has(resource.type)
    ? `Admin.${toPascalCase(resource.type)}`
    : `Commerce.${toPascalCase(resource.type)}`;

  const domain = subject.persona ? `Persona.${toPascalCase(subject.persona)}` : `Role.${toPascalCase(subject.role)}`;

  const attributes: Record<string, string> = {
    "Subject.Id": subject.id,
    "Subject.Role": subject.role,
    "Subject.Persona": subject.persona ?? "",
    "Subject.IsSuperUser": toAttributeValue(subject.isSuperUser ?? false),
    "Subject.AllowedSalesOrgs": toAttributeValue(subject.attributes.allowedSalesOrgs),
    "Subject.SelectedAccountId": toAttributeValue(subject.attributes.selectedAccountId),
    "Subject.ToolIds": toAttributeValue(subject.attributes.toolIds),
    "Resource.Type": resource.type,
  };

  for (const [key, value] of Object.entries(resource.attributes)) {
    attributes[`Resource.${toPascalCase(key)}`] = toAttributeValue(value);
  }
  for (const [key, value] of Object.entries(environment ?? {})) {
    attributes[`Environment.${toPascalCase(key)}`] = toAttributeValue(value);
  }

  return {
    domain,
    action,
    service,
    identityProvider: "PingOne.HonDemo",
    attributes,
  };
}

async function evaluateAccessRemote(request: DecisionRequest): Promise<DecisionResult> {
  const body = toTrustFrameworkRequest(request);

  const res = await pingRequest<PdpResponse>(getPdpBaseUrl(), "/governance-engine", {
    method: "POST",
    body,
  });

  const advice = res.statements?.map((s) => s.name).filter(Boolean).join("; ");
  // Real API returns `authorised` (British spelling) — `authorized` kept as a fallback.
  // `decision` can also be "INDETERMINATE" (no policy matched / eval error) — treat as Deny.
  const authorised = res.authorised ?? res.authorized ?? false;
  return {
    effect: authorised || res.decision === "PERMIT" ? "Permit" : "Deny",
    engine: "pingauthorize",
    reason: advice || undefined,
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
    };
  }

  const permitMatch = policies.find((p) => p.effect === "Permit" && policyMatches(p, request));
  if (permitMatch) {
    return {
      effect: "Permit",
      engine: "pingauthorize-demo",
      reason: `Permitted by policy "${permitMatch.name}" (${permitMatch.id})`,
      matchedPolicyId: permitMatch.id,
    };
  }

  return {
    effect: "Deny",
    engine: "pingauthorize-demo",
    reason: "No applicable policy matched — default deny",
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function evaluateAccess(request: DecisionRequest): Promise<DecisionResult> {
  if (isPdpConfigured()) {
    try {
      return await evaluateAccessRemote(request);
    } catch (error) {
      console.warn(
        "[PingAuthorize] Remote PDP call failed, falling back to local demo evaluator:",
        error instanceof Error ? error.message : error
      );
      return evaluateAccessLocal(request);
    }
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
