/**
 * Admin Console — admin role only
 *
 * Route is protected by middleware (redirects non-admins to /403).
 * Tabs:
 *   - Provider       — active authorization provider, connectivity, audit trail
 *   - Policy Sets    — PingAuthorize policy set CRUD
 *   - Policies       — PingAuthorize policy CRUD + visual policy editor
 *   - Policy Matrix  — legacy Permit.io policy matrix (live API)
 *   - Demo Users     — demo persona reference
 */

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ProviderPanel } from "@/components/admin/ProviderPanel";
import { ProviderSwitcher } from "@/components/admin/ProviderSwitcher";
import { PolicySetsPanel } from "@/components/admin/PolicySetsPanel";
import { PoliciesPanel } from "@/components/admin/PoliciesPanel";
import { RulesPanel } from "@/components/admin/RulesPanel";

interface PermitRole {
  key: string;
  name: string;
  description?: string;
}

interface PermitResource {
  key: string;
  name: string;
  actions: string[];
}

interface PermitAssignment {
  role: string;
  resource: string;
  actions: string[];
}

interface PolicyData {
  roles: PermitRole[];
  resources: PermitResource[];
  assignments: PermitAssignment[];
  source: string;
  message?: string;
}

const DEMO_USERS = [
  { id: "user-admin", email: "admin@demo.com", name: "Miguel Patel", role: "admin", accounts: 5, tools: "TL001, TL003, TL004, TL009" },
  { id: "user-buyer", email: "buyer@demo.com", name: "Carlos Johnson", role: "buyer", accounts: 2, tools: "TL003, TL004" },
  { id: "user-viewer", email: "viewer@demo.com", name: "Sarah Chen", role: "viewer", accounts: 1, tools: "TL004, TL009" },
];

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-50 text-red-700 border-red-200",
  buyer: "bg-blue-50 text-blue-700 border-blue-200",
  viewer: "bg-gray-50 text-gray-600 border-gray-200",
};

export default function AdminPage() {
  const { user } = useAuth();
  const [policy, setPolicy] = useState<PolicyData | null>(null);
  const [policyLoading, setPolicyLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"provider" | "policySets" | "policies" | "rules" | "matrix" | "users">("provider");
  const [policySetFilter, setPolicySetFilter] = useState<string | undefined>(undefined);
  const [policySetName, setPolicySetName] = useState<string | undefined>(undefined);
  const [policyFilter, setPolicyFilter] = useState<string | undefined>(undefined);
  const [policyName, setPolicyName] = useState<string | undefined>(undefined);
  const [providerVersion, setProviderVersion] = useState(0);

  useEffect(() => {
    fetch("/api/admin/permit-policy")
      .then((r) => r.json())
      .then((data) => setPolicy(data))
      .catch(() => setPolicy(null))
      .finally(() => setPolicyLoading(false));
  }, []);

  // Build a matrix: role × resource → actions[]
  const matrix = new Map<string, Map<string, string[]>>();
  if (policy) {
    for (const role of policy.roles) {
      matrix.set(role.key, new Map());
    }
    for (const assignment of policy.assignments) {
      if (!matrix.has(assignment.role)) matrix.set(assignment.role, new Map());
      matrix.get(assignment.role)!.set(assignment.resource, assignment.actions);
    }
  }

  const resourceKeys = policy?.resources.map((r) => r.key) ?? [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin Console</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Multi-provider authorization management · Logged in as{" "}
            <span className="text-[#C8102E] font-medium">{user?.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ProviderSwitcher onChanged={() => setProviderVersion((v) => v + 1)} />
          {policy?.source === "permit.io" && (
            <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-green-700">Permit.io Connected</span>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit flex-wrap">
        {([
          ["provider", "Provider"],
          ["policySets", "Policy Sets"],
          ["policies", "Policies"],
          ["matrix", "Policy Matrix"],
          ["users", "Demo Users"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`rounded-md px-4 py-2 text-xs font-medium transition-all ${
              activeTab === key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
        <a
          href="/admin/test-access"
          className="rounded-md px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-700"
        >
          Decision Testing →
        </a>
      </div>

      {/* ── Provider Tab ───────────────────────────────── */}
      {activeTab === "provider" && <ProviderPanel key={providerVersion} />}

      {/* ── Policy Sets Tab ────────────────────────────── */}
      {activeTab === "policySets" && (
        <PolicySetsPanel
          onSelect={(id, name) => {
            setPolicySetFilter(id);
            setPolicySetName(name);
            setActiveTab("policies");
          }}
        />
      )}

      {/* ── Policies Tab ───────────────────────────────── */}
      {activeTab === "policies" && (
        <div className="space-y-3">
          {policySetFilter && (
            <button
              onClick={() => {
                setPolicySetFilter(undefined);
                setPolicySetName(undefined);
                setActiveTab("policySets");
              }}
              className="text-xs font-medium text-gray-500 hover:text-gray-800"
            >
              ← Back to Policy Sets
            </button>
          )}
          <PoliciesPanel
            policySetIdFilter={policySetFilter}
            policySetName={policySetName}
            onSelectPolicy={(id, name) => {
              setPolicyFilter(id);
              setPolicyName(name);
              setActiveTab("rules");
            }}
          />
        </div>
      )}

      {/* ── Rules Tab (drill-down from Policies, real mode only) ─ */}
      {activeTab === "rules" && policyFilter && (
        <div className="space-y-3">
          <button
            onClick={() => {
              setPolicyFilter(undefined);
              setPolicyName(undefined);
              setActiveTab("policies");
            }}
            className="text-xs font-medium text-gray-500 hover:text-gray-800"
          >
            ← Back to Policies
          </button>
          <RulesPanel policyId={policyFilter} policyName={policyName} />
        </div>
      )}

      {/* ── Policy Matrix Tab ──────────────────────────── */}
      {activeTab === "matrix" && (
        <div className="space-y-4">
          {/* Source info */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50">
                <svg className="h-5 w-5 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Authorization Policy Matrix</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {policy?.source === "permit.io"
                    ? "Live data from Permit.io API — roles, resources, and permissions are managed centrally."
                    : policy?.message ?? "Loading policy data..."}
                </p>
              </div>
            </div>
          </div>

          {policyLoading ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 flex items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#C8102E] border-t-transparent" />
              <span className="ml-3 text-sm text-gray-500">Loading policy from Permit.io...</span>
            </div>
          ) : policy && policy.roles.length > 0 ? (
            <>
              {/* Roles overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {policy.roles.map((role) => {
                  const totalPerms = Array.from(matrix.get(role.key)?.values() ?? []).reduce(
                    (sum, actions) => sum + actions.length,
                    0
                  );
                  return (
                    <div
                      key={role.key}
                      className={`rounded-xl border p-4 ${ROLE_COLORS[role.key] ?? "bg-gray-50 text-gray-700 border-gray-200"}`}
                    >
                      <p className="text-sm font-semibold capitalize">{role.name}</p>
                      <p className="text-[11px] opacity-70 mt-0.5">{role.description ?? role.key}</p>
                      <p className="text-lg font-bold mt-2">{totalPerms}</p>
                      <p className="text-[10px] opacity-60">permissions granted</p>
                    </div>
                  );
                })}
              </div>

              {/* Matrix table */}
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                          Role
                        </th>
                        {resourceKeys.map((res) => (
                          <th
                            key={res}
                            className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                          >
                            {res}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {policy.roles.map((role) => (
                        <tr key={role.key} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize border ${
                                ROLE_COLORS[role.key] ?? "bg-gray-50 text-gray-600 border-gray-200"
                              }`}
                            >
                              {role.name}
                            </span>
                          </td>
                          {resourceKeys.map((res) => {
                            const actions = matrix.get(role.key)?.get(res) ?? [];
                            return (
                              <td key={res} className="px-4 py-3">
                                {actions.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {actions.map((action) => (
                                      <span
                                        key={action}
                                        className="inline-block rounded-md bg-green-50 border border-green-200 px-1.5 py-0.5 text-[10px] font-mono text-green-700"
                                      >
                                        {action}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-gray-300">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Resources detail */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  Registered Resources & Actions
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {policy.resources.map((res) => (
                    <div key={res.key} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <p className="text-xs font-semibold text-gray-800 capitalize">{res.name}</p>
                      <p className="text-[10px] font-mono text-gray-400 mt-0.5">{res.key}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {res.actions.map((a) => (
                          <span key={a} className="rounded bg-white border border-gray-200 px-1.5 py-0.5 text-[10px] font-mono text-gray-600">
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-medium text-amber-800">Permit.io not available</p>
              <p className="text-xs text-amber-600 mt-1">
                {policy?.message ?? "Could not connect to Permit.io API. Policy data unavailable."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Users Tab ─────────────────────────────────── */}
      {activeTab === "users" && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">Demo User Profiles</p>
            <p className="text-xs text-gray-500 mt-0.5">User configurations for the demo environment</p>
          </div>
          <div className="divide-y divide-gray-100">
            {DEMO_USERS.map((u) => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                  u.role === "admin" ? "bg-red-100 text-red-700"
                  : u.role === "buyer" ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-600"
                }`}>
                  {u.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{u.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{u.email}</p>
                </div>
                <div className="hidden sm:block text-right">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize border ${
                    ROLE_COLORS[u.role] ?? "bg-gray-50 text-gray-600 border-gray-200"
                  }`}>
                    {u.role}
                  </span>
                </div>
                <div className="hidden md:block text-right">
                  <p className="text-[10px] text-gray-400">Accounts</p>
                  <p className="text-xs font-semibold text-gray-700">{u.accounts}</p>
                </div>
                <div className="hidden lg:block text-right">
                  <p className="text-[10px] text-gray-400">Tools</p>
                  <p className="text-[10px] font-mono text-gray-500">{u.tools}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
