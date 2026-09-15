/**
 * PingAuthorize Policies — typed API wrapper
 * ============================================================================
 * Real mode (PING_PAP_URL configured): calls the real PingAuthorize Policy
 * Manager REST API — grounded verbatim in developer.pingidentity.com's
 * Policy Manager reference (fetched September 2026):
 *
 *   GET    /v2/policy-manager/policies?branch={branchId}&page=&page-size=
 *   GET    /v2/policy-manager/policies/{id}?branch={branchId}
 *   POST   /v2/policy-manager/policies?branch={branchId}
 *   PUT    /v2/policy-manager/policies/{id}?branch={branchId}   (full-object replace)
 *   DELETE /v2/policy-manager/policies/{id}
 *
 * IMPORTANT — real parent/child relationship: unlike this app's original
 * (fabricated) model, a real PingAuthorize Policy has NO `policySetId`
 * field. Instead the *parent* PolicySet owns a `children: EntityRef[]`
 * array that references its child Policies by `{id, type: "Policy"}`. So:
 *   - Filtering policies "by policy set" means reading the PolicySet's
 *     `children` and fetching each referenced Policy.
 *   - Creating a policy "inside" a policy set means: (1) create the Policy,
 *     then (2) append an `EntityRef` to the parent PolicySet's `children`
 *     via `updatePolicySet`.
 *
 * Demo mode (PING_PAP_URL not set): operates on the local in-memory store
 * (./demoStore.ts), which keeps the simpler flat `policySetId` shape
 * (`DemoPolicy`) for the local decision evaluator — see types.ts.
 */

import { pingRequest, isPapConfigured, getPapBaseUrl, requireBranchId } from "./client";
import * as demo from "./demoStore";
import { getPolicySet } from "./policySets";
import type { CombiningAlgorithm, DemoPolicy, EntityRef, PaginatedResponse, PingPolicy, PingPolicySet, PolicyConditionGroup, PolicyEffect, PolicySetStatus } from "./types";

const POLICIES_PATH = "/v2/policy-manager/policies";

const DEFAULT_COMBINING_ALGORITHM: CombiningAlgorithm = { algorithm: "DenyOverrides" };

export async function listPolicies(policySetId?: string): Promise<Array<PingPolicy | DemoPolicy>> {
  if (!isPapConfigured()) return demo.listPoliciesDemo(policySetId);

  const branch = requireBranchId();

  if (policySetId) {
    // Real API has no server-side "policies by policy set" filter — the
    // relationship lives on the PolicySet's `children` references instead.
    // We're in real mode here (isPapConfigured() checked above), so `parent`
    // is a PingPolicySet, not a DemoPolicySet.
    const parent = (await getPolicySet(policySetId)) as PingPolicySet | undefined;
    const refs = ((parent?.children ?? []) as EntityRef[]).filter((c) => c.type === "Policy");
    return Promise.all(refs.map((ref) => pingRequest<PingPolicy>(
      getPapBaseUrl(),
      `${POLICIES_PATH}/${encodeURIComponent(ref.id)}?branch=${encodeURIComponent(branch)}`
    )));
  }

  const res = await pingRequest<PaginatedResponse<PingPolicy>>(
    getPapBaseUrl(),
    `${POLICIES_PATH}?branch=${encodeURIComponent(branch)}&page=1&page-size=100`
  );
  return res.data;
}

export async function getPolicy(id: string): Promise<PingPolicy | DemoPolicy | undefined> {
  if (!isPapConfigured()) return demo.getPolicyDemo(id);
  const branch = requireBranchId();
  return pingRequest<PingPolicy>(
    getPapBaseUrl(),
    `${POLICIES_PATH}/${encodeURIComponent(id)}?branch=${encodeURIComponent(branch)}`
  );
}

export interface CreatePolicyInput {
  /** Demo-mode-only field (real API associates via the parent PolicySet's `children` — see below). */
  policySetId?: string;
  name: string;
  description?: string;
  shared?: boolean;
  disabled?: boolean;
  combiningAlgorithm?: CombiningAlgorithm;
  /** Demo-mode-only fields, used by the local evaluator. */
  effect?: PolicyEffect;
  conditions?: PolicyConditionGroup;
}

export async function createPolicy(input: CreatePolicyInput): Promise<PingPolicy | DemoPolicy> {
  if (!isPapConfigured()) {
    return demo.createPolicyDemo({
      policySetId: input.policySetId ?? "",
      name: input.name,
      description: input.description,
      effect: input.effect ?? "Permit",
      conditions: input.conditions ?? { subject: [], resource: [], action: [], environment: [] },
    });
  }

  const branch = requireBranchId();
  const created = await pingRequest<PingPolicy>(getPapBaseUrl(), `${POLICIES_PATH}?branch=${encodeURIComponent(branch)}`, {
    method: "POST",
    body: {
      type: "Policy",
      name: input.name,
      description: input.description,
      shared: input.shared ?? false,
      disabled: input.disabled ?? false,
      combiningAlgorithm: input.combiningAlgorithm ?? DEFAULT_COMBINING_ALGORITHM,
    },
  });

  // Wire the new Policy up as a child of its parent PolicySet, if given.
  if (input.policySetId) {
    const parent = await getPolicySet(input.policySetId);
    if (parent && "combiningAlgorithm" in parent) {
      const children = [...((parent.children ?? []) as EntityRef[]), { id: created.id, type: "Policy" }];
      await pingRequest<unknown>(
        getPapBaseUrl(),
        `/v2/policy-manager/policysets/${encodeURIComponent(input.policySetId)}?branch=${encodeURIComponent(branch)}`,
        { method: "PUT", body: { ...parent, children } }
      );
    }
  }

  return created;
}

export async function updatePolicy(
  id: string,
  updates: Partial<CreatePolicyInput> & { status?: PolicySetStatus }
): Promise<PingPolicy | DemoPolicy | undefined> {
  if (!isPapConfigured()) {
    return demo.updatePolicyDemo(id, {
      name: updates.name,
      description: updates.description,
      effect: updates.effect,
      conditions: updates.conditions,
      status: updates.status,
    });
  }

  const branch = requireBranchId();
  const current = await pingRequest<PingPolicy | undefined>(
    getPapBaseUrl(),
    `${POLICIES_PATH}/${encodeURIComponent(id)}?branch=${encodeURIComponent(branch)}`
  );
  if (!current) return undefined;

  const disabled = updates.disabled ?? (updates.status ? updates.status === "disabled" : current.disabled);

  return pingRequest<PingPolicy>(getPapBaseUrl(), `${POLICIES_PATH}/${encodeURIComponent(id)}?branch=${encodeURIComponent(branch)}`, {
    method: "PUT",
    body: {
      ...current,
      name: updates.name ?? current.name,
      description: updates.description ?? current.description,
      shared: updates.shared ?? current.shared,
      disabled,
      combiningAlgorithm: updates.combiningAlgorithm ?? current.combiningAlgorithm,
    },
  });
}

export async function deletePolicy(id: string): Promise<boolean> {
  if (!isPapConfigured()) return demo.deletePolicyDemo(id);
  // Per the grounded delete-policyset.md pattern (delete endpoints omit `branch`).
  await pingRequest<void>(getPapBaseUrl(), `${POLICIES_PATH}/${encodeURIComponent(id)}`, { method: "DELETE" });
  return true;
}

/**
 * Best-effort compatibility helper for the existing Admin Console "Publish"
 * button. NOTE: this does NOT perform a real PingAuthorize deployment — real
 * publishing requires committing a Snapshot on the branch and creating a
 * Deployment Package (see MIGRATION.md). This only clears `disabled`.
 */
export async function publishPolicy(id: string): Promise<PingPolicy | DemoPolicy | undefined> {
  return updatePolicy(id, { status: "published", disabled: false });
}

/** Renders a policy as the "generated policy JSON" shown in the visual Policy Editor UI. */
export function toPolicyJson(policy: PingPolicy | DemoPolicy): string {
  if ("effect" in policy) {
    // Demo-mode flat shape.
    return JSON.stringify(
      {
        id: policy.id,
        policySetId: policy.policySetId,
        name: policy.name,
        description: policy.description,
        effect: policy.effect,
        status: policy.status,
        target: {
          subject: policy.conditions.subject,
          resource: policy.conditions.resource,
          action: policy.conditions.action,
          environment: policy.conditions.environment,
        },
      },
      null,
      2
    );
  }
  // Real PingAuthorize Policy shape — shown as-is (tree of children/targets/statements).
  return JSON.stringify(policy, null, 2);
}
