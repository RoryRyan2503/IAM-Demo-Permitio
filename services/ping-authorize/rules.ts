/**
 * PingAuthorize Rules — typed API wrapper
 * ============================================================================
 * Real mode (PING_PAP_URL configured): calls the real PingAuthorize Policy
 * Manager REST API — grounded verbatim in developer.pingidentity.com's
 * Policy Manager reference (fetched September 2026):
 *
 *   GET    /v2/policy-manager/rules?branch={branchId}&page=&page-size=
 *   GET    /v2/policy-manager/rules/{id}?branch={branchId}
 *   POST   /v2/policy-manager/rules?branch={branchId}
 *   PUT    /v2/policy-manager/rules/{id}?branch={branchId}   (full-object replace)
 *   DELETE /v2/policy-manager/rules/{id}
 *
 * (Read-one/read-all/update/delete were not individually re-verified against
 * live docs pages this session — only "create rule" was fetched — but they
 * follow the exact same path/verb/branch-param pattern confirmed for
 * PolicySets and Policies, which was consistent across every entity type.)
 *
 * A Rule is the leaf node that actually decides Permit/Deny via
 * `effectSettings`. Rules are wired into a parent Policy the same way
 * Policies are wired into a PolicySet: the parent's `children` array gets an
 * `EntityRef` (`{id, type: "Rule"}`) appended via a full-object PUT on the
 * parent Policy.
 *
 * There is no local demo-mode equivalent for Rules — the demo store models
 * decisions with a flat Permit/Deny `effect` directly on `DemoPolicy` and
 * has no separate Rule concept. Calling these functions without PING_PAP_URL
 * configured throws.
 */

import { pingRequest, isPapConfigured, getPapBaseUrl, requireBranchId, PingAuthorizeError } from "./client";
import { getPolicy } from "./policies";
import type { EntityRef, PaginatedResponse, PingPolicy, PingRule, RuleEffectSettings } from "./types";

const RULES_PATH = "/v2/policy-manager/rules";

function assertRealMode(): void {
  if (!isPapConfigured()) {
    throw new PingAuthorizeError(
      "Rules are only available in real PingAuthorize mode (PING_PAP_URL not configured) — there is no demo-mode Rule store."
    );
  }
}

export async function listRules(): Promise<PingRule[]> {
  assertRealMode();
  const branch = requireBranchId();
  const res = await pingRequest<PaginatedResponse<PingRule>>(
    getPapBaseUrl(),
    `${RULES_PATH}?branch=${encodeURIComponent(branch)}&page=1&page-size=100`
  );
  return res.data;
}

export async function getRule(id: string): Promise<PingRule | undefined> {
  assertRealMode();
  const branch = requireBranchId();
  return pingRequest<PingRule>(getPapBaseUrl(), `${RULES_PATH}/${encodeURIComponent(id)}?branch=${encodeURIComponent(branch)}`);
}

export interface CreateRuleInput {
  /** Parent Policy this Rule should be wired into as a child (optional). */
  policyId?: string;
  name: string;
  description?: string;
  shared?: boolean;
  disabled?: boolean;
  effectSettings: RuleEffectSettings;
}

export async function createRule(input: CreateRuleInput): Promise<PingRule> {
  assertRealMode();
  const branch = requireBranchId();

  const created = await pingRequest<PingRule>(getPapBaseUrl(), `${RULES_PATH}?branch=${encodeURIComponent(branch)}`, {
    method: "POST",
    body: {
      type: "Rule",
      name: input.name,
      description: input.description,
      shared: input.shared ?? false,
      disabled: input.disabled ?? false,
      effectSettings: input.effectSettings,
    },
  });

  if (input.policyId) {
    const parent = (await getPolicy(input.policyId)) as PingPolicy | undefined;
    if (parent && "combiningAlgorithm" in parent) {
      const children = [...((parent.children ?? []) as EntityRef[]), { id: created.id, type: "Rule" }];
      await pingRequest<unknown>(
        getPapBaseUrl(),
        `/v2/policy-manager/policies/${encodeURIComponent(input.policyId)}?branch=${encodeURIComponent(branch)}`,
        { method: "PUT", body: { ...parent, children } }
      );
    }
  }

  return created;
}

export interface UpdateRuleInput {
  name?: string;
  description?: string;
  shared?: boolean;
  disabled?: boolean;
  effectSettings?: RuleEffectSettings;
}

export async function updateRule(id: string, updates: UpdateRuleInput): Promise<PingRule | undefined> {
  assertRealMode();
  const branch = requireBranchId();

  const current = await getRule(id);
  if (!current) return undefined;

  return pingRequest<PingRule>(getPapBaseUrl(), `${RULES_PATH}/${encodeURIComponent(id)}?branch=${encodeURIComponent(branch)}`, {
    method: "PUT",
    body: {
      ...current,
      name: updates.name ?? current.name,
      description: updates.description ?? current.description,
      shared: updates.shared ?? current.shared,
      disabled: updates.disabled ?? current.disabled,
      effectSettings: updates.effectSettings ?? current.effectSettings,
    },
  });
}

export async function deleteRule(id: string): Promise<boolean> {
  assertRealMode();
  await pingRequest<void>(getPapBaseUrl(), `${RULES_PATH}/${encodeURIComponent(id)}`, { method: "DELETE" });
  return true;
}
