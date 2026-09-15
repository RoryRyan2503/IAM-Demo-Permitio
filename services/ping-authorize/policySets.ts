/**
 * PingAuthorize Policy Sets — typed API wrapper
 * ============================================================================
 * Real mode (PING_PAP_URL configured): calls the real PingAuthorize Policy
 * Manager REST API — grounded verbatim in developer.pingidentity.com's
 * Policy Manager reference (fetched September 2026):
 *
 *   GET    /v2/policy-manager/policysets?branch={branchId}&page=&page-size=&onlyShared=
 *   GET    /v2/policy-manager/policysets/{id}?branch={branchId}
 *   POST   /v2/policy-manager/policysets?branch={branchId}
 *   PUT    /v2/policy-manager/policysets/{id}?branch={branchId}   (full-object replace)
 *   DELETE /v2/policy-manager/policysets/{id}
 *
 * Auth is `x-user-id` (see client.ts). Every call except DELETE requires the
 * `branch` query param — see PING_BRANCH_ID / requireBranchId() in client.ts.
 *
 * Demo mode (PING_PAP_URL not set): operates on the local in-memory store
 * (./demoStore.ts) seeded with the Phase 8 persona policy sets, so the Admin
 * Console works fully without a live PingAuthorize tenant. Demo objects use a
 * different, simplified shape (`DemoPolicySet`) — see types.ts.
 *
 * NOTE: the real API has no per-entity "publish" status — publishing is a
 * separate Branch → Snapshot → Deployment Package flow (not implemented
 * here yet). `status`/`disabled` below is a best-effort compatibility shim
 * for the existing Admin Console UI, which still assumes a draft/published
 * toggle; only `disabled` has a real API equivalent.
 */

import { pingRequest, isPapConfigured, getPapBaseUrl, requireBranchId } from "./client";
import * as demo from "./demoStore";
import type { CombiningAlgorithm, DemoPolicySet, PaginatedResponse, PingPolicySet, PolicySetStatus } from "./types";

const POLICYSETS_PATH = "/v2/policy-manager/policysets";

const DEFAULT_COMBINING_ALGORITHM: CombiningAlgorithm = { algorithm: "DenyOverrides" };

export interface CreatePolicySetInput {
  name: string;
  description?: string;
  shared?: boolean;
  disabled?: boolean;
  combiningAlgorithm?: CombiningAlgorithm;
}

export interface UpdatePolicySetInput {
  name?: string;
  description?: string;
  shared?: boolean;
  disabled?: boolean;
  combiningAlgorithm?: CombiningAlgorithm;
  /** Demo-mode / legacy UI convenience field — mapped to `disabled` for real-mode calls. */
  status?: PolicySetStatus;
}

export async function listPolicySets(): Promise<Array<PingPolicySet | DemoPolicySet>> {
  if (!isPapConfigured()) return demo.listPolicySetsDemo();

  const branch = requireBranchId();
  const res = await pingRequest<PaginatedResponse<PingPolicySet>>(
    getPapBaseUrl(),
    `${POLICYSETS_PATH}?branch=${encodeURIComponent(branch)}&page=1&page-size=100`
  );
  return res.data;
}

export async function getPolicySet(id: string): Promise<PingPolicySet | DemoPolicySet | undefined> {
  if (!isPapConfigured()) return demo.getPolicySetDemo(id);

  const branch = requireBranchId();
  return pingRequest<PingPolicySet>(
    getPapBaseUrl(),
    `${POLICYSETS_PATH}/${encodeURIComponent(id)}?branch=${encodeURIComponent(branch)}`
  );
}

export async function createPolicySet(input: CreatePolicySetInput): Promise<PingPolicySet | DemoPolicySet> {
  if (!isPapConfigured()) return demo.createPolicySetDemo({ name: input.name, description: input.description });

  const branch = requireBranchId();
  return pingRequest<PingPolicySet>(getPapBaseUrl(), `${POLICYSETS_PATH}?branch=${encodeURIComponent(branch)}`, {
    method: "POST",
    body: {
      type: "PolicySet",
      name: input.name,
      description: input.description,
      shared: input.shared ?? false,
      disabled: input.disabled ?? false,
      combiningAlgorithm: input.combiningAlgorithm ?? DEFAULT_COMBINING_ALGORITHM,
    },
  });
}

export async function updatePolicySet(
  id: string,
  updates: UpdatePolicySetInput
): Promise<PingPolicySet | DemoPolicySet | undefined> {
  if (!isPapConfigured()) {
    return demo.updatePolicySetDemo(id, { name: updates.name, description: updates.description, status: updates.status });
  }

  const branch = requireBranchId();
  // Real PUT is a full-object replace, so fetch the current entity first and merge.
  const current = await pingRequest<PingPolicySet | undefined>(
    getPapBaseUrl(),
    `${POLICYSETS_PATH}/${encodeURIComponent(id)}?branch=${encodeURIComponent(branch)}`
  );
  if (!current) return undefined;

  const disabled = updates.disabled ?? (updates.status ? updates.status === "disabled" : current.disabled);

  return pingRequest<PingPolicySet>(
    getPapBaseUrl(),
    `${POLICYSETS_PATH}/${encodeURIComponent(id)}?branch=${encodeURIComponent(branch)}`,
    {
      method: "PUT",
      body: {
        ...current,
        name: updates.name ?? current.name,
        description: updates.description ?? current.description,
        shared: updates.shared ?? current.shared,
        disabled,
        combiningAlgorithm: updates.combiningAlgorithm ?? current.combiningAlgorithm,
      },
    }
  );
}

export async function deletePolicySet(id: string): Promise<boolean> {
  if (!isPapConfigured()) return demo.deletePolicySetDemo(id);
  // Per the grounded delete-policyset.md example, no `branch` query param is sent here.
  await pingRequest<void>(getPapBaseUrl(), `${POLICYSETS_PATH}/${encodeURIComponent(id)}`, { method: "DELETE" });
  return true;
}

/**
 * Best-effort compatibility helper for the existing Admin Console "Publish"
 * button. NOTE: this does NOT perform a real PingAuthorize deployment — real
 * publishing requires committing a Snapshot on the branch and creating a
 * Deployment Package (see MIGRATION.md). This only clears `disabled`.
 */
export async function publishPolicySet(id: string): Promise<PingPolicySet | DemoPolicySet | undefined> {
  return updatePolicySet(id, { status: "published", disabled: false });
}
