"use client";

/**
 * Decision Testing Console — /admin/test-access
 *
 * Lets an admin enter a synthetic user/role/resource/action/context and run
 * the SAME authorization request against Permit.io and PingAuthorize side by
 * side, to compare the two engines while migrating policies.
 */

import { useState } from "react";
import { Fragment } from "react";
import Link from "next/link";

const RESOURCES = ["products", "orders", "quotes", "invoices", "cart", "accounts", "reports", "admin_dashboard", "users"];
const ACTIONS = ["view", "view_pricing", "create", "update", "delete", "manage"];
const ROLES = ["admin", "buyer", "viewer"] as const;
const PERSONAS = ["procurement", "sales", "finance", "general", "GBE"];

interface DecisionResult {
  provider: string;
  allowed: boolean;
  engine: string;
  raw?: unknown;
  reason?: string;
  latencyMs: number;
  error?: string;
  providerName: string;
}

interface TestAccessResponse {
  request: unknown;
  results: DecisionResult[];
  agree: boolean;
}

export default function TestAccessPage() {
  const [userId, setUserId] = useState("user-buyer");
  const [role, setRole] = useState<(typeof ROLES)[number]>("buyer");
  const [persona, setPersona] = useState("procurement");
  const [resource, setResource] = useState("products");
  const [action, setAction] = useState("view");
  const [allowedSalesOrgs, setAllowedSalesOrgs] = useState("IA001,BA002");
  const [selectedAccountId, setSelectedAccountId] = useState("ACC100");
  const [toolIds, setToolIds] = useState("TL001,TL003");
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [result, setResult] = useState<TestAccessResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/test-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          role,
          persona,
          isSuperUser,
          allowedSalesOrgs: allowedSalesOrgs.split(",").map((s) => s.trim()).filter(Boolean),
          selectedAccountId,
          toolIds: toolIds.split(",").map((s) => s.trim()).filter(Boolean),
          resource,
          action,
        }),
      });
      if (res.ok) setResult(await res.json());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <Link href="/admin" className="text-xs text-gray-400 hover:text-gray-600">
          ← Back to Admin Console
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1">Decision Testing Console</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Compare Permit.io vs PingAuthorize decisions for the same request
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-600">User ID</label>
          <input value={userId} onChange={(e) => setUserId(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600">Persona</label>
          <select value={persona} onChange={(e) => setPersona(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
            {PERSONAS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600">Resource</label>
          <select value={resource} onChange={(e) => setResource(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
            {RESOURCES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600">Action</label>
          <select value={action} onChange={(e) => setAction(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
            {ACTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <input type="checkbox" id="superuser" checked={isSuperUser} onChange={(e) => setIsSuperUser(e.target.checked)} />
          <label htmlFor="superuser" className="text-xs font-semibold text-gray-600">Super User</label>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600">Allowed Sales Orgs</label>
          <input value={allowedSalesOrgs} onChange={(e) => setAllowedSalesOrgs(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600">Selected Account ID</label>
          <input value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600">Tool IDs</label>
          <input value={toolIds} onChange={(e) => setToolIds(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono" />
        </div>

        <div className="md:col-span-3">
          <button
            onClick={run}
            disabled={loading}
            className="rounded-lg bg-[#C8102E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#a80d26] disabled:opacity-50"
          >
            {loading ? "Running..." : "Run Comparison"}
          </button>
        </div>
      </div>

      {result && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className={`px-5 py-3 border-b border-gray-100 ${result.agree ? "bg-green-50" : "bg-amber-50"}`}>
            <p className={`text-sm font-semibold ${result.agree ? "text-green-800" : "text-amber-800"}`}>
              {result.agree ? "Providers agree" : "Providers DISAGREE"}
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Provider</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Result</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Engine</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Latency</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.results.map((r) => (
                <Fragment key={r.provider}>
                  <tr className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{r.provider}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          r.allowed ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {r.allowed ? "ALLOW" : "DENY"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{r.engine}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{r.reason ?? r.error ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{r.latencyMs}ms</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setExpanded(expanded === r.provider ? null : r.provider)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800"
                      >
                        {expanded === r.provider ? "Hide" : "View"}
                      </button>
                    </td>
                  </tr>
                  {expanded === r.provider && (
                    <tr>
                      <td colSpan={6} className="px-4 py-3 bg-gray-50">
                        <pre className="text-[11px] overflow-x-auto">{JSON.stringify(r.raw ?? r, null, 2)}</pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
