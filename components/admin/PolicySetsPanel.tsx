"use client";

/**
 * PolicySetsPanel — Admin Console "Policy Sets" tab
 *
 * Table of PingAuthorize policy sets with full create/edit/delete/view-detail
 * CRUD, versatile enough for both:
 *   - Real mode: `combiningAlgorithm`, `shared`, `disabled`, `children` (child
 *     Policies, referenced by ID — drill in via "Policies →").
 *   - Demo mode: the simplified `status` (draft/published/disabled) shape.
 */

import { useCallback, useEffect, useState } from "react";
import {
  AnyPolicySet,
  COMBINING_ALGORITHMS,
  CombiningAlgorithm,
  isRealPolicySet,
} from "./pingTypes";

const STATUS_STYLE: Record<string, string> = {
  published: "bg-green-50 text-green-700 border-green-200",
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  disabled: "bg-gray-50 text-gray-500 border-gray-200",
};

interface FormState {
  name: string;
  description: string;
  algorithm: CombiningAlgorithm["algorithm"];
  shared: boolean;
  disabled: boolean;
}

const EMPTY_FORM: FormState = { name: "", description: "", algorithm: "DenyOverrides", shared: false, disabled: false };

export function PolicySetsPanel({ onSelect }: { onSelect?: (policySetId: string, policySetName: string) => void }) {
  const [items, setItems] = useState<AnyPolicySet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [detail, setDetail] = useState<AnyPolicySet | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/policy-sets");
      const data = await res.json();
      if (res.ok) setItems(data.data ?? []);
      else setError(data.error ?? "Failed to load policy sets");
    } catch {
      setError("Failed to reach the server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setCreating(false);
    setEditingId(null);
  };

  const submit = async () => {
    if (!form.name.trim()) return;
    const body = {
      name: form.name,
      description: form.description || undefined,
      shared: form.shared,
      disabled: form.disabled,
      combiningAlgorithm: { algorithm: form.algorithm },
    };
    if (editingId) {
      await fetch(`/api/admin/policy-sets/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/admin/policy-sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    resetForm();
    load();
  };

  const startEdit = (ps: AnyPolicySet) => {
    setForm({
      name: ps.name,
      description: ps.description ?? "",
      algorithm: isRealPolicySet(ps) ? ps.combiningAlgorithm.algorithm : "DenyOverrides",
      shared: isRealPolicySet(ps) ? Boolean(ps.shared) : false,
      disabled: isRealPolicySet(ps) ? Boolean(ps.disabled) : ps.status === "disabled",
    });
    setEditingId(ps.id);
    setCreating(true);
  };

  const toggleEnabled = async (ps: AnyPolicySet) => {
    if (isRealPolicySet(ps)) {
      await fetch(`/api/admin/policy-sets/${ps.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled: !ps.disabled }),
      });
    } else {
      await fetch(`/api/admin/policy-sets/${ps.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: ps.status === "disabled" ? "draft" : "disabled" }),
      });
    }
    load();
  };

  const publish = async (ps: AnyPolicySet) => {
    await fetch(`/api/admin/policy-sets/${ps.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this policy set? Child policies are not automatically deleted in real mode.")) return;
    await fetch(`/api/admin/policy-sets/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">Policy Sets</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Named containers that combine child Policies via a combining algorithm
          </p>
        </div>
        <button
          onClick={() => (creating ? resetForm() : setCreating(true))}
          className="rounded-lg bg-[#C8102E] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#a80d26]"
        >
          {creating ? "Cancel" : "+ New Policy Set"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">{error}</div>
      )}

      {creating && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-600">{editingId ? "Edit Policy Set" : "New Policy Set"}</p>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Policy set name"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            rows={2}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-xs font-semibold text-gray-600">Combining Algorithm</label>
              <select
                value={form.algorithm}
                onChange={(e) => setForm((f) => ({ ...f, algorithm: e.target.value as CombiningAlgorithm["algorithm"] }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {COMBINING_ALGORITHMS.map((alg) => (
                  <option key={alg} value={alg}>
                    {alg}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-1">How child Policies are combined (real mode only)</p>
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={form.shared}
                onChange={(e) => setForm((f) => ({ ...f, shared: e.target.checked }))}
              />
              Shared
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={form.disabled}
                onChange={(e) => setForm((f) => ({ ...f, disabled: e.target.checked }))}
              />
              Disabled
            </label>
          </div>
          <button
            onClick={submit}
            className="rounded-lg bg-gray-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-gray-700"
          >
            {editingId ? "Save Changes" : "Create"}
          </button>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-xs text-gray-400">Loading...</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-xs text-gray-400">No policy sets yet.</td>
              </tr>
            ) : (
              items.map((ps) => (
                <tr key={ps.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-800">{ps.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{ps.description ?? "—"}</td>
                  <td className="px-4 py-3">
                    {isRealPolicySet(ps) ? (
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                          ps.disabled ? STATUS_STYLE.disabled : STATUS_STYLE.published
                        }`}
                      >
                        {ps.disabled ? "disabled" : "enabled"}
                      </span>
                    ) : (
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_STYLE[ps.status]}`}>
                        {ps.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-gray-400">
                    {isRealPolicySet(ps) ? (
                      <>
                        {ps.combiningAlgorithm.algorithm} · {(ps.children ?? []).filter((c) => c.type === "Policy").length} polic{(ps.children ?? []).filter((c) => c.type === "Policy").length === 1 ? "y" : "ies"}
                        {ps.shared ? " · shared" : ""}
                      </>
                    ) : (
                      "demo mode"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button onClick={() => setDetail(ps)} className="text-xs font-medium text-gray-500 hover:text-gray-800">
                      View
                    </button>
                    <button onClick={() => startEdit(ps)} className="text-xs font-medium text-blue-600 hover:text-blue-800">
                      Edit
                    </button>
                    {onSelect && (
                      <button onClick={() => onSelect(ps.id, ps.name)} className="text-xs font-medium text-blue-600 hover:text-blue-800">
                        Policies →
                      </button>
                    )}
                    {isRealPolicySet(ps) ? (
                      <button onClick={() => toggleEnabled(ps)} className="text-xs font-medium text-amber-600 hover:text-amber-800">
                        {ps.disabled ? "Enable" : "Disable"}
                      </button>
                    ) : (
                      ps.status !== "published" && (
                        <button onClick={() => publish(ps)} className="text-xs font-medium text-green-600 hover:text-green-800">
                          Publish
                        </button>
                      )
                    )}
                    <button onClick={() => remove(ps.id)} className="text-xs font-medium text-red-600 hover:text-red-800">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-xl p-5 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-gray-800">{detail.name}</p>
            <p className="text-xs text-gray-500 mt-1">{detail.description}</p>
            <pre className="mt-3 rounded-lg bg-gray-50 p-3 text-[11px] overflow-x-auto max-h-96">{JSON.stringify(detail, null, 2)}</pre>
            <button onClick={() => setDetail(null)} className="mt-3 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

