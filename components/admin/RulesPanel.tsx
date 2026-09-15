"use client";

/**
 * RulesPanel — Admin Console "Rules" drill-down (real mode only)
 *
 * A Rule is the leaf of the PingAuthorize policy tree — it carries the
 * actual Permit/Deny decision via `effectSettings`:
 *   - unconditionalPermit / unconditionalDeny: no condition needed.
 *   - conditionalPermitElseDeny / conditionalDenyElsePermit: requires a
 *     `condition` expression string.
 *
 * Scoped to a single parent Policy (via `policyId`), consuming
 * GET/POST /api/admin/rules?policyId=... and GET/PUT/DELETE /api/admin/rules/[id].
 */

import { useCallback, useEffect, useState } from "react";
import { RealRule, RULE_EFFECT_LABEL, RULE_EFFECT_TYPES, RuleEffectType } from "./pingTypes";

interface FormState {
  name: string;
  description: string;
  effectType: RuleEffectType;
  condition: string;
  shared: boolean;
  disabled: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  effectType: "unconditionalPermit",
  condition: "",
  shared: false,
  disabled: false,
};

const EFFECT_STYLE: Record<string, string> = {
  unconditionalPermit: "bg-green-50 text-green-700 border-green-200",
  unconditionalDeny: "bg-red-50 text-red-700 border-red-200",
  conditionalPermitElseDeny: "bg-blue-50 text-blue-700 border-blue-200",
  conditionalDenyElsePermit: "bg-amber-50 text-amber-700 border-amber-200",
};

const needsCondition = (t: RuleEffectType) => t === "conditionalPermitElseDeny" || t === "conditionalDenyElsePermit";

export function RulesPanel({ policyId, policyName }: { policyId: string; policyName?: string }) {
  const [rules, setRules] = useState<RealRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RealRule | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/rules?policyId=${policyId}`);
      const data = await res.json();
      if (res.ok) setRules(data.data ?? []);
      else setError(data.error ?? "Failed to load rules");
    } catch {
      setError("Failed to reach the server");
    } finally {
      setLoading(false);
    }
  }, [policyId]);

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
    if (needsCondition(form.effectType) && !form.condition.trim()) return;
    const body = {
      policyId: editingId ? undefined : policyId,
      name: form.name,
      description: form.description || undefined,
      shared: form.shared,
      disabled: form.disabled,
      effectSettings: needsCondition(form.effectType)
        ? { type: form.effectType, condition: form.condition }
        : { type: form.effectType },
    };
    if (editingId) {
      await fetch(`/api/admin/rules/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/admin/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    resetForm();
    load();
  };

  const startEdit = (rule: RealRule) => {
    setForm({
      name: rule.name,
      description: rule.description ?? "",
      effectType: rule.effectSettings.type,
      condition: rule.effectSettings.condition ?? "",
      shared: Boolean(rule.shared),
      disabled: Boolean(rule.disabled),
    });
    setEditingId(rule.id);
    setCreating(true);
  };

  const toggleEnabled = async (rule: RealRule) => {
    await fetch(`/api/admin/rules/${rule.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disabled: !rule.disabled }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    await fetch(`/api/admin/rules/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">Rules{policyName ? ` — ${policyName}` : ""}</p>
          <p className="text-xs text-gray-500 mt-0.5">The actual Permit/Deny decisions and their conditions</p>
        </div>
        <button
          onClick={() => (creating ? resetForm() : setCreating(true))}
          className="rounded-lg bg-[#C8102E] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#a80d26]"
        >
          {creating ? "Cancel" : "+ New Rule"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">{error}</div>
      )}

      {creating && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-600">{editingId ? "Edit Rule" : "New Rule"}</p>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Rule name"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            rows={2}
          />
          <div>
            <label className="text-xs font-semibold text-gray-600">Effect</label>
            <select
              value={form.effectType}
              onChange={(e) => setForm((f) => ({ ...f, effectType: e.target.value as RuleEffectType }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {RULE_EFFECT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {RULE_EFFECT_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          {needsCondition(form.effectType) && (
            <div>
              <label className="text-xs font-semibold text-gray-600">Condition expression</label>
              <textarea
                value={form.condition}
                onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
                placeholder='e.g. subject.role == "admin"'
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono text-xs"
                rows={2}
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Evaluated by PingAuthorize&apos;s policy engine; must be a valid condition expression for your PDP.
              </p>
            </div>
          )}
          <div className="flex gap-4">
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
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rule Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Effect</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Condition</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-xs text-gray-400">Loading...</td>
              </tr>
            ) : rules.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-xs text-gray-400">No rules yet.</td>
              </tr>
            ) : (
              rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-800">{rule.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${EFFECT_STYLE[rule.effectSettings.type]}`}
                    >
                      {RULE_EFFECT_LABEL[rule.effectSettings.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-gray-500 font-mono max-w-xs truncate">
                    {rule.effectSettings.condition ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{rule.disabled ? "disabled" : "enabled"}</td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button onClick={() => setDetail(rule)} className="text-xs font-medium text-gray-500 hover:text-gray-800">
                      View
                    </button>
                    <button onClick={() => startEdit(rule)} className="text-xs font-medium text-blue-600 hover:text-blue-800">
                      Edit
                    </button>
                    <button onClick={() => toggleEnabled(rule)} className="text-xs font-medium text-amber-600 hover:text-amber-800">
                      {rule.disabled ? "Enable" : "Disable"}
                    </button>
                    <button onClick={() => remove(rule.id)} className="text-xs font-medium text-red-600 hover:text-red-800">
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
