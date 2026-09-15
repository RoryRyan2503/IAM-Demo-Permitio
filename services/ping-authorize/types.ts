/**
 * PingAuthorize — shared type definitions
 * ============================================================================
 * Two type families live here:
 *
 * 1. `Demo*` types — a simplified flat subject/resource/action/environment
 *    condition model used ONLY by the local in-memory demo store
 *    (./demoStore.ts) and the local decision evaluator in decisions.ts, for
 *    when no real PingAuthorize tenant is configured. These are NOT part of
 *    the real PingAuthorize API — they exist purely so the Admin Console demo
 *    experience works with zero external dependencies.
 *
 * 2. `Ping*` Policy Manager types (`PingPolicySet`, `PingPolicy`, `PingRule`,
 *    `PingTarget`, `PingStatement`, `CombiningAlgorithm`, ...) — grounded
 *    verbatim in the real PingAuthorize Policy Manager REST API reference
 *    (developer.pingidentity.com/pingauthorize/pingauthorize/policy-editor/
 *    policy-manager*, fetched September 2026). These are the actual JSON
 *    shapes sent to/received from `{PING_PAP_URL}/v2/policy-manager/...`.
 *    Real PingAuthorize's policy model is a tree: a PolicySet's `children`
 *    reference (or embed) Policies; a Policy's `children` reference (or
 *    embed) Rules; Rules carry the actual `effectSettings` (Permit/Deny) and
 *    `condition`. Policies/PolicySets/Rules can all reference reusable
 *    `targets` (when the entity applies) and `statements` (obligations/advice)
 *    by ID. Every Policy Manager endpoint requires a `branch` (or `snapshot`)
 *    query parameter — see `PING_BRANCH_ID` in client.ts.
 */

export type PolicyEffect = "Permit" | "Deny";

export type PolicySetStatus = "draft" | "published" | "disabled";

export interface PolicyCondition {
  id: string;
  /** e.g. "subject.persona", "resource.sales_org_id", "environment.time" */
  attributePath: string;
  operator: "equals" | "contains" | "in" | "not_equals" | "exists";
  value?: string | string[];
}

export interface PolicyConditionGroup {
  subject: PolicyCondition[];
  resource: PolicyCondition[];
  action: PolicyCondition[];
  environment: PolicyCondition[];
}

/** Demo-mode-only Policy (local evaluator shape) \u2014 not part of the real PingAuthorize API. */
export interface DemoPolicy {
  id: string;
  policySetId: string;
  name: string;
  description?: string;
  effect: PolicyEffect;
  conditions: PolicyConditionGroup;
  status: PolicySetStatus;
  createdAt: string;
  lastModified: string;
}

/** Demo-mode-only Policy Set (local evaluator shape) \u2014 not part of the real PingAuthorize API. */
export interface DemoPolicySet {
  id: string;
  name: string;
  description?: string;
  status: PolicySetStatus;
  createdAt: string;
  lastModified: string;
}

// ---------------------------------------------------------------------------
// Real PingAuthorize Policy Manager API types \u2014 grounded verbatim in
// developer.pingidentity.com/pingauthorize/pingauthorize/policy-editor/
// policy-manager* (fetched September 2026). See file header for details.
// ---------------------------------------------------------------------------

/** A reference to another Policy Manager entity by ID (used for `children`, or a lightweight node reference). */
export interface EntityRef {
  id: string;
  type: string;
}

export type CombiningAlgorithmName =
  | "DenyOverrides"
  | "DenyUnlessPermit"
  | "DenyUnlessThreshold"
  | "FirstApplicable"
  | "OnlyOneApplicable"
  | "PermitOverrides"
  | "PermitUnlessDeny";

export interface CombiningAlgorithm {
  algorithm: CombiningAlgorithmName;
  /** Continue evaluating even after the final decision is known. Default false. */
  evaluateAll?: boolean;
}

/** A Rule's effect: unconditional, or conditional on a boolean `condition` expression. */
export type RuleEffectSettings =
  | { type: "unconditionalPermit" }
  | { type: "unconditionalDeny" }
  | { type: "conditionalPermitElseDeny"; condition: string }
  | { type: "conditionalDenyElsePermit"; condition: string };

/** Paginated collection response shape used by all Policy Manager "list" endpoints. */
export interface PaginatedResponse<T> {
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
  data: T[];
}

/**
 * A PingAuthorize Rule \u2014 the leaf node that actually produces a Permit/Deny
 * decision via `effectSettings`. Referenced (or embedded) as a child of a
 * Policy. `condition`/`targets`/`statements` shapes are opaque here (full
 * recursive condition grammar not yet grounded in this codebase) \u2014 treated
 * as pass-through JSON.
 */
export interface PingRule {
  id: string;
  version?: string;
  type: "Rule";
  name: string;
  description?: string;
  shared?: boolean;
  disabled?: boolean;
  effectSettings: RuleEffectSettings;
  /** Opaque condition expression object, e.g. `{ "empty": {} }` for "always applies". */
  condition?: unknown;
  /** IDs (or embedded refs) of Targets that gate when this Rule applies. */
  targets?: unknown[];
  /** IDs (or embedded refs) of Statements attached to this Rule's decision. */
  statements?: unknown[];
}

/**
 * A PingAuthorize Policy \u2014 a container of child Rules (or nested Policies)
 * combined via `combiningAlgorithm` to produce one decision.
 */
export interface PingPolicy {
  id: string;
  version?: string;
  type: "Policy";
  name: string;
  description?: string;
  shared?: boolean;
  disabled?: boolean;
  combiningAlgorithm: CombiningAlgorithm;
  /** Child Rules/Policies, either embedded representations or `EntityRef` references. */
  children?: unknown[];
  repetitionSettings?: unknown;
  condition?: unknown;
  targets?: unknown[];
  statements?: unknown[];
}

/**
 * A PingAuthorize Policy Set \u2014 a container of child Policies (or nested
 * Policy Sets) combined via `combiningAlgorithm`. Top-level entry point for a
 * branch's policy tree.
 */
export interface PingPolicySet {
  id: string;
  version?: string;
  type: "PolicySet";
  name: string;
  description?: string;
  shared?: boolean;
  disabled?: boolean;
  combiningAlgorithm: CombiningAlgorithm;
  children?: unknown[];
  condition?: unknown;
  targets?: unknown[];
  statements?: unknown[];
}

export interface DecisionSubject {
  id: string;
  role: string;
  persona?: string;
  isSuperUser?: boolean;
  attributes: Record<string, unknown>;
}

export interface DecisionResource {
  type: string;
  attributes: Record<string, unknown>;
}

export interface DecisionRequest {
  subject: DecisionSubject;
  resource: DecisionResource;
  action: string;
  environment?: Record<string, unknown>;
}

export interface DecisionResult {
  effect: PolicyEffect;
  /** Which engine produced the result: "pingauthorize" (real PDP) or "pingauthorize-demo" (local store) */
  engine: string;
  reason?: string;
  matchedPolicyId?: string;
  raw?: unknown;
}

// ---------------------------------------------------------------------------
// JSON PDP API wire format — grounded in the PingAuthorize Server
// Administration Guide (JSON PDP API request/response format, verified
// verbatim by the user, September 2026). This is PingAuthorize's real
// "Trust Framework" request shape: Domain / Action / Service / Identity
// Provider are named, optional, dot-namespaced string attributes used for
// coarse-grained policy routing, and `attributes` is a REQUIRED (but may be
// empty) flat `map<string, string>` of "Other Attributes" — each key must
// match the name of a Trust Framework attribute configured in the PAP GUI
// with a "Request resolver". There is no nested subject/resource/environment
// shape on the wire — see decisions.ts `toTrustFrameworkRequest()` for how
// this app's internal DecisionRequest is flattened into this format.
// ---------------------------------------------------------------------------

/** A single JSON PDP API decision request. */
export interface PdpRequest {
  /** e.g. "Sales.Asia Pacific" — coarse business/organizational grouping */
  domain?: string;
  /** e.g. "Retrieve" — the operation being performed */
  action?: string;
  /** e.g. "Mobile.Landing page" — the application/service being accessed */
  service?: string;
  /** e.g. "Social Networks.Spacebook" — source of the caller's identity */
  identityProvider?: string;
  /** Required (may be {}). Keys must match Trust Framework attribute names configured in the PAP. */
  attributes: Record<string, string>;
}

export interface PdpBatchRequest {
  requests: PdpRequest[];
}

export interface PdpStatement {
  id: string;
  name: string;
  code: string;
  payload: string;
  obligatory: boolean;
  fulfilled: boolean;
  attributes: Record<string, unknown>;
}

export interface PdpResponse {
  id: string;
  deploymentPackageId: string;
  timestamp: string;
  elapsedTime: number;
  /** Uppercase per the real API: "PERMIT" | "DENY" | "INDETERMINATE" (no policy matched / evaluation error). */
  decision: "PERMIT" | "DENY" | "INDETERMINATE";
  /**
   * NOTE: the real, live PingAuthorize JSON PDP API returns this field as
   * `authorised` (British spelling), NOT `authorized` — verified against a
   * real tenant September 2026. Both spellings are declared here (and both
   * checked in decisions.ts) so this keeps working if a future/differently
   * configured tenant uses the American spelling instead.
   */
  authorised?: boolean;
  authorized?: boolean;
  statements: PdpStatement[];
  status: { code: string; messages: string[]; errors: string[] };
}

export interface PdpBatchResponse {
  responses: PdpResponse[];
}
