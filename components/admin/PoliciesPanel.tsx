"use client";

/**
 * PoliciesPanel — Admin Console "Policies" tab
 *
 * Real mode: a Policy has no `effect`/`conditions` of its own — it combines
 * child Rules (which carry the actual Permit/Deny `effectSettings`) via a
 * `combiningAlgorithm`. This panel edits name/description/shared/disabled/
 * combiningAlgorithm inline, and drills into a Policy's Rules via "Rules →".
 *
 * Demo mode: policies keep the simpler flat Permit/Deny + conditions shape,
 * edited via the visual PolicyEditor (unchanged).
 */

import { useCallback, useEffect, useState } from "react";
import { PolicyEditor, type EditablePolicy } from "./PolicyEditor";
import { AnyPolicy, COMBINING_ALGORITHMS, CombiningAlgorithm, isRealPolicy } from "./pingTypes";

interface PolicySetOption {
  id: string;
  name: string;
}

const EFFECT_STYLE: Record<string, string> = {
  Permit: "bg-green-50 text-green-700 border-green-200",
  Deny: "bg-red-50 text-red-700 border-red-200",
};

interface FormState {
  name: string;
  description: string;
  policySetId: string;
  algorithm: CombiningAlgorithm["algorithm"];
  shared: boolean;
  disabled: boolean;
}

function emptyForm(policySetId: string): FormState {
  return { name: "", description: "", policySetId, algorithm: "DenyOverrides", shared: false, disabled: false };
}

export function PoliciesPanel({
  policySetIdFilter,
  policySetName,
  onSelectPolicy,
}: {
  policySetIdFilter?: string;
  policySetName?: string;
  onSelectPolicy?: (policyId: string, policyName: string) => void;
}) {
  const [policies, setPolicies] = useState<AnyPolicy[]>([]);
  const [policySets, setPolicySets] = useState<PolicySetOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDemo, setEditingDemo] = useState<EditablePolicy | "new" | null>(null);
  const [realForm, setRealForm] = useState<FormState | null>(null);
  const [realEditingId, setRealEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = policySetIdFilter ? `?policySetId=${policySetIdFilter}` : "";
      const [policiesRes, setsRes] = await Promise.all([
        fetch(`/api/admin/policies${query}`),
        fetch("/api/admin/policy-sets"),
      ]);
      const policiesData = await policiesRes.json();
      if (policiesRes.ok) setPolicies(policiesData.data ?? []);
      else setError(policiesData.error ?? "Failed to load policies");
      if (setsRes.ok) setPolicySets(((await setsRes.json()).data ?? []).map((p: any) => ({ id: p.id, name: p.name })));
    } catch {
      setError("Failed to reach the server");
    } finally {
      setLoading(false);
    }
  }, [policySetIdFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const setNameFor = (id: string) => policySets.find((p) => p.id === id)?.name ?? id;

  // ---- demo-mode (flat effect/conditions) save/publish ----
  const saveDemo = async (policy: EditablePolicy) => {
    if (policy.id) {
      await fetch(`/api/admin/policies/${policy.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policy),
      });
    } else {
      await fetch("/api/admin/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policy),
      });
    }
    setEditingDemo(null);
    load();
  };

  const publishDemo = async (policy: EditablePolicy) => {
    await saveDemo(policy);
    if (policy.id) {
      await fetch(`/api/admin/policies/${policy.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      load();
    }
  };

  // ---- real-mode (tree/combiningAlgorithm) create/edit ----
  const startCreate = () => setRealForm(emptyForm(policySetIdFilter ?? policySets[0]?.id ?? ""));

  const startEditReal = (p: AnyPolicy) => {
    if (!isRealPolicy(p)) return;
    setRealForm({
      name: p.name,
      description: p.description ?? "",
      policySetId: policySetIdFilter ?? "",
      algorithm: p.combiningAlgorithm.algorithm,
      shared: Boolean(p.shared),
      disabled: Boolean(p.disabled),
    });
    setRealEditingId(p.id);
  };

  const submitReal = async () => {
    if (!realForm || !realForm.name.trim()) return;
    const body = {
      policySetId: realForm.policySetId || undefined,
      name: realForm.name,
      description: realForm.description || undefined,
      shared: realForm.shared,
      disabled: realForm.disabled,
      combiningAlgorithm: { algorithm: realForm.algorithm },
    };
    if (realEditingId) {
      await fetch(`/api/admin/policies/${realEditingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/admin/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    setRealForm(null);
    setRealEditingId(null);
    load();
  };

  const toggleEnabled = async (p: AnyPolicy) => {
    if (!isRealPolicy(p)) return;
    await fetch(`/api/admin/policies/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disabled: !p.disabled }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this policy? Child rules are not automatically deleted in real mode.")) return;
    await fetch(`/api/admin/policies/${id}`, { method: "DELETE" });
    setEditingDemo(null);
    load();
  };

  if (editingDemo) {
    const initial = editingDemo === "new" ? undefined : editingDemo;
    return (
      <PolicyEditor
        policySets={policySets}
        initial={initial}
        onSave={saveDemo}
        onPublish={publishDemo}
        onDelete={editingDemo !== "new" ? () => remove((editingDemo as EditablePolicy).id!) : undefined}
        onCancel={() => setEditingDemo(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">
            Policies{policySetName ? ` — ${policySetName}` : ""}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Combines child Rules (Permit/Deny) via a combining algorithm
          </p>
        </div>
        <button
          onClick={startCreate}
          disabled={policySets.length === 0}
          className="rounded-lg bg-[#C8102E] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#a80d26] disabled:opacity-50"
        >
          + New Policy
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">{error}</div>
      )}

      {realForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-600">{realEditingId ? "Edit Policy" : "New Policy"}</p>
          <input
            value={realForm.name}
            onChange={(e) => setRealForm((f) => f && { ...f, name: e.target.value })}
            placeholder="Policy name"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <textarea
            value={realForm.description}
            onChange={(e) => setRealForm((f) => f && { ...f, description: e.target.value })}
            placeholder="Description"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            rows={2}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!policySetIdFilter && (
              <div>
                <label className="text-xs font-semibold text-gray-600">Parent Policy Set</label>
                <select
                  value={realForm.policySetId}
                  onChange={(e) => setRealForm((f) => f && { ...f, policySetId: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="">— none —</option>
                  {policySets.map((ps) => (
                    <option key={ps.id} value={ps.id}>
                      {ps.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-gray-600">Combining Algorithm</label>
              <select
                value={realForm.algorithm}
                onChange={(e) => setRealForm((f) => f && { ...f, algorithm: e.target.value as CombiningAlgorithm["algorithm"] })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {COMBINING_ALGORITHMS.map((alg) => (
                  <option key={alg} value={alg}>
                    {alg}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={realForm.shared}
                onChange={(e) => setRealForm((f) => f && { ...f, shared: e.target.checked })}
              />
              Shared
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={realForm.disabled}
                onChange={(e) => setRealForm((f) => f && { ...f, disabled: e.target.checked })}
              />
              Disabled
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={submitReal}
              className="rounded-lg bg-gray-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-gray-700"
            >
              {realEditingId ? "Save Changes" : "Create"}
            </button>
            <button
              onClick={() => {
                setRealForm(null);
                setRealEditingId(null);
              }}
              className="rounded-lg bg-white border border-gray-200 px-3.5 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Policy Name</th>
              {!policySetIdFilter && (
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Policy Set</th>
              )}
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Effect / Algorithm</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-xs text-gray-400">Loading...</td>
              </tr>
            ) : policies.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-xs text-gray-400">No policies yet.</td>
              </tr>
            ) : (
              policies.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  {!policySetIdFilter && (
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {!isRealPolicy(p) ? setNameFor(p.policySetId) : "—"}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {isRealPolicy(p) ? (
                      <span className="text-xs text-gray-500">
                        {p.combiningAlgorithm.algorithm} · {(p.children ?? []).filter((c) => c.type === "Rule").length} rule
                        {(p.children ?? []).filter((c) => c.type === "Rule").length === 1 ? "" : "s"}
                      </span>
                    ) : (
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${EFFECT_STYLE[p.effect]}`}>
                        {p.effect}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {isRealPolicy(p) ? (p.disabled ? "disabled" : "enabled") : p.status}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    {isRealPolicy(p) ? (
                      <>
                        <button onClick={() => startEditReal(p)} className="text-xs font-medium text-blue-600 hover:text-blue-800">
                          Edit
                        </button>
                        {onSelectPolicy && (
                          <button onClick={() => onSelectPolicy(p.id, p.name)} className="text-xs font-medium text-blue-600 hover:text-blue-800">
                            Rules →
                          </button>
                        )}
                        <button onClick={() => toggleEnabled(p)} className="text-xs font-medium text-amber-600 hover:text-amber-800">
                          {p.disabled ? "Enable" : "Disable"}
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setEditingDemo(p as unknown as EditablePolicy)} className="text-xs font-medium text-blue-600 hover:text-blue-800">
                        Edit
                      </button>
                    )}
                    <button onClick={() => remove(p.id)} className="text-xs font-medium text-red-600 hover:text-red-800">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

