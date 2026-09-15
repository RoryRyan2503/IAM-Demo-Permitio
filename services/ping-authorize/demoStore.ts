/**
 * In-memory demo policy store for PingAuthorize
 * ============================================================================
 * When PING_PAP_URL / PING_PDP_URL are not configured, the PingAuthorize
 * service layer operates against this local store instead of a real
 * PingAuthorize tenant — mirroring how PermitProvider falls back to local
 * RBAC when Permit.io isn't configured. This lets the Admin Console's Policy
 * Sets / Policies / Policy Editor / Decision Testing screens work fully
 * out of the box.
 *
 * Seeded with the Phase 8 demo scenarios: Procurement, Finance, Sales, Admin.
 *
 * Uses globalThis so it survives Next.js dev-mode HMR reloads (same pattern
 * as lib/debug/traceStore.ts).
 */

import type { DemoPolicy, DemoPolicySet } from "./types";

interface DemoStoreState {
  policySets: DemoPolicySet[];
  policies: DemoPolicy[];
  seeded: boolean;
}

function getState(): DemoStoreState {
  const g = globalThis as unknown as { __pingAuthorizeDemoStore?: DemoStoreState };
  if (!g.__pingAuthorizeDemoStore) {
    g.__pingAuthorizeDemoStore = { policySets: [], policies: [], seeded: false };
  }
  const state = g.__pingAuthorizeDemoStore;
  if (!state.seeded) seedDemoData(state);
  return state;
}

function now(): string {
  return new Date().toISOString();
}

function seedDemoData(state: DemoStoreState): void {
  const ts = now();

  const policySets: DemoPolicySet[] = [
    {
      id: "ps-procurement",
      name: "Procurement User",
      description: "Can view products and create orders. Cannot manage users.",
      status: "published",
      createdAt: ts,
      lastModified: ts,
    },
    {
      id: "ps-finance",
      name: "Finance User",
      description: "Can view invoices and export reports.",
      status: "published",
      createdAt: ts,
      lastModified: ts,
    },
    {
      id: "ps-sales",
      name: "Sales User",
      description: "Can view customer orders and accounts.",
      status: "published",
      createdAt: ts,
      lastModified: ts,
    },
    {
      id: "ps-admin",
      name: "Admin",
      description: "Full access to all resources.",
      status: "published",
      createdAt: ts,
      lastModified: ts,
    },
  ];

  const policies: DemoPolicy[] = [
    {
      id: "pol-procurement-view-products",
      policySetId: "ps-procurement",
      name: "Procurement — View Products",
      description: "Allows the procurement persona to view the product catalog.",
      effect: "Permit",
      status: "published",
      createdAt: ts,
      lastModified: ts,
      conditions: {
        subject: [{ id: "c1", attributePath: "subject.persona", operator: "equals", value: "procurement" }],
        resource: [{ id: "c2", attributePath: "resource.type", operator: "equals", value: "products" }],
        action: [{ id: "c3", attributePath: "action", operator: "equals", value: "view" }],
        environment: [],
      },
    },
    {
      id: "pol-procurement-create-orders",
      policySetId: "ps-procurement",
      name: "Procurement — Create Orders",
      description: "Allows the procurement persona to create orders.",
      effect: "Permit",
      status: "published",
      createdAt: ts,
      lastModified: ts,
      conditions: {
        subject: [{ id: "c1", attributePath: "subject.persona", operator: "equals", value: "procurement" }],
        resource: [{ id: "c2", attributePath: "resource.type", operator: "equals", value: "orders" }],
        action: [{ id: "c3", attributePath: "action", operator: "equals", value: "create" }],
        environment: [],
      },
    },
    {
      id: "pol-procurement-deny-users",
      policySetId: "ps-procurement",
      name: "Procurement — Deny Manage Users",
      description: "Explicitly denies user management for the procurement persona.",
      effect: "Deny",
      status: "published",
      createdAt: ts,
      lastModified: ts,
      conditions: {
        subject: [{ id: "c1", attributePath: "subject.persona", operator: "equals", value: "procurement" }],
        resource: [{ id: "c2", attributePath: "resource.type", operator: "equals", value: "users" }],
        action: [{ id: "c3", attributePath: "action", operator: "equals", value: "manage" }],
        environment: [],
      },
    },
    {
      id: "pol-finance-view-invoices",
      policySetId: "ps-finance",
      name: "Finance — View Invoices",
      description: "Allows the finance persona to view invoices/quotes.",
      effect: "Permit",
      status: "published",
      createdAt: ts,
      lastModified: ts,
      conditions: {
        subject: [{ id: "c1", attributePath: "subject.persona", operator: "equals", value: "finance" }],
        resource: [{ id: "c2", attributePath: "resource.type", operator: "in", value: ["quotes", "invoices"] }],
        action: [{ id: "c3", attributePath: "action", operator: "equals", value: "view" }],
        environment: [],
      },
    },
    {
      id: "pol-finance-export-reports",
      policySetId: "ps-finance",
      name: "Finance — Export Reports",
      description: "Allows the finance persona to view/export reports.",
      effect: "Permit",
      status: "published",
      createdAt: ts,
      lastModified: ts,
      conditions: {
        subject: [{ id: "c1", attributePath: "subject.persona", operator: "equals", value: "finance" }],
        resource: [{ id: "c2", attributePath: "resource.type", operator: "equals", value: "reports" }],
        action: [{ id: "c3", attributePath: "action", operator: "in", value: ["view", "manage"] }],
        environment: [],
      },
    },
    {
      id: "pol-sales-view-orders",
      policySetId: "ps-sales",
      name: "Sales — View Customer Orders",
      description: "Allows the sales persona to view customer orders.",
      effect: "Permit",
      status: "published",
      createdAt: ts,
      lastModified: ts,
      conditions: {
        subject: [{ id: "c1", attributePath: "subject.persona", operator: "equals", value: "sales" }],
        resource: [{ id: "c2", attributePath: "resource.type", operator: "equals", value: "orders" }],
        action: [{ id: "c3", attributePath: "action", operator: "equals", value: "view" }],
        environment: [],
      },
    },
    {
      id: "pol-sales-view-accounts",
      policySetId: "ps-sales",
      name: "Sales — View Accounts",
      description: "Allows the sales persona to view accounts.",
      effect: "Permit",
      status: "published",
      createdAt: ts,
      lastModified: ts,
      conditions: {
        subject: [{ id: "c1", attributePath: "subject.persona", operator: "equals", value: "sales" }],
        resource: [{ id: "c2", attributePath: "resource.type", operator: "equals", value: "accounts" }],
        action: [{ id: "c3", attributePath: "action", operator: "equals", value: "view" }],
        environment: [],
      },
    },
    {
      id: "pol-admin-full-access",
      policySetId: "ps-admin",
      name: "Admin — Full Access",
      description: "Grants unconditional access to all resources and actions.",
      effect: "Permit",
      status: "published",
      createdAt: ts,
      lastModified: ts,
      conditions: {
        subject: [{ id: "c1", attributePath: "subject.role", operator: "equals", value: "admin" }],
        resource: [],
        action: [],
        environment: [],
      },
    },
  ];

  state.policySets = policySets;
  state.policies = policies;
  state.seeded = true;
}

// ---------------------------------------------------------------------------
// Policy Sets CRUD
// ---------------------------------------------------------------------------

export function listPolicySetsDemo(): DemoPolicySet[] {
  return getState().policySets;
}

export function getPolicySetDemo(id: string): DemoPolicySet | undefined {
  return getState().policySets.find((p) => p.id === id);
}

export function createPolicySetDemo(input: Pick<DemoPolicySet, "name" | "description">): DemoPolicySet {
  const ts = now();
  const policySet: DemoPolicySet = {
    id: `ps-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name,
    description: input.description,
    status: "draft",
    createdAt: ts,
    lastModified: ts,
  };
  getState().policySets.push(policySet);
  return policySet;
}

export function updatePolicySetDemo(
  id: string,
  updates: Partial<Pick<DemoPolicySet, "name" | "description" | "status">>
): DemoPolicySet | undefined {
  const state = getState();
  const idx = state.policySets.findIndex((p) => p.id === id);
  if (idx === -1) return undefined;
  state.policySets[idx] = { ...state.policySets[idx], ...updates, lastModified: now() };
  return state.policySets[idx];
}

export function deletePolicySetDemo(id: string): boolean {
  const state = getState();
  const before = state.policySets.length;
  state.policySets = state.policySets.filter((p) => p.id !== id);
  state.policies = state.policies.filter((p) => p.policySetId !== id);
  return state.policySets.length < before;
}

// ---------------------------------------------------------------------------
// Policies CRUD
// ---------------------------------------------------------------------------

export function listPoliciesDemo(policySetId?: string): DemoPolicy[] {
  const all = getState().policies;
  return policySetId ? all.filter((p) => p.policySetId === policySetId) : all;
}

export function getPolicyDemo(id: string): DemoPolicy | undefined {
  return getState().policies.find((p) => p.id === id);
}

export function createPolicyDemo(
  input: Pick<DemoPolicy, "policySetId" | "name" | "description" | "effect" | "conditions">
): DemoPolicy {
  const ts = now();
  const policy: DemoPolicy = {
    id: `pol-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: "draft",
    createdAt: ts,
    lastModified: ts,
    ...input,
  };
  getState().policies.push(policy);
  return policy;
}

export function updatePolicyDemo(
  id: string,
  updates: Partial<Pick<DemoPolicy, "name" | "description" | "effect" | "conditions" | "status">>
): DemoPolicy | undefined {
  const state = getState();
  const idx = state.policies.findIndex((p) => p.id === id);
  if (idx === -1) return undefined;
  state.policies[idx] = { ...state.policies[idx], ...updates, lastModified: now() };
  return state.policies[idx];
}

export function deletePolicyDemo(id: string): boolean {
  const state = getState();
  const before = state.policies.length;
  state.policies = state.policies.filter((p) => p.id !== id);
  return state.policies.length < before;
}
