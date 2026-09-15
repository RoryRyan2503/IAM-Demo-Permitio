"use client";

/**
 * PolicyEditor — visual editor for a single PingAuthorize Policy
 *
 * Fields: Policy Name, Description, Policy Set, Effect (Permit/Deny),
 * Subject/Resource/Action/Environment Conditions. Shows the generated policy
 * JSON live. Supports Save (draft), Publish, and Delete.
 */

import { useMemo, useState } from "react";

interface PolicyCondition {
  id: string;
  attributePath: string;
  operator: "equals" | "contains" | "in" | "not_equals" | "exists";
  value?: string;
}

interface PolicyConditions {
  subject: PolicyCondition[];
  resource: PolicyCondition[];
  action: PolicyCondition[];
  environment: PolicyCondition[];
}

export interface EditablePolicy {
  id?: string;
  policySetId: string;
  name: string;
  description?: string;
  effect: "Permit" | "Deny";
  conditions: PolicyConditions;
  status?: "draft" | "published" | "disabled";
}

const EMPTY_CONDITIONS: PolicyConditions = { subject: [], resource: [], action: [], environment: [] };

const OPERATORS: PolicyCondition["operator"][] = ["equals", "not_equals", "contains", "in", "exists"];

function ConditionGroupEditor({
  label,
  hint,
  items,
  onChange,
}: {
  label: string;
  hint: string;
  items: PolicyCondition[];
  onChange: (items: PolicyCondition[]) => void;
}) {
  const add = () => onChange([...items, { id: `c-${Date.now()}`, attributePath: "", operator: "equals", value: "" }]);
  const update = (idx: number, patch: Partial<PolicyCondition>) =>
    onChange(items.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-600">{label}</p>
        <button onClick={add} type="button" className="text-[11px] font-medium text-blue-600 hover:text-blue-800">
          + Add condition
        </button>
      </div>
      <p className="text-[10px] text-gray-400">{hint}</p>
      {items.map((c, idx) => (
        <div key={c.id} className="flex items-center gap-1.5">
          <input
            value={c.attributePath}
            onChange={(e) => update(idx, { attributePath: e.target.value })}
            placeholder="attribute path e.g. subject.persona"
            className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-mono"
          />
          <select
            value={c.operator}
            onChange={(e) => update(idx, { operator: e.target.value as PolicyCondition["operator"] })}
            className="rounded-md border border-gray-200 px-1.5 py-1 text-xs"
          >
            {OPERATORS.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
          <input
            value={c.value ?? ""}
            onChange={(e) => update(idx, { value: e.target.value })}
            placeholder="value"
            className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs"
          />
          <button onClick={() => remove(idx)} type="button" className="text-xs text-red-500 hover:text-red-700 px-1">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function PolicyEditor({
  policySets,
  initial,
  onSave,
  onPublish,
  onDelete,
  onCancel,
}: {
  policySets: { id: string; name: string }[];
  initial?: EditablePolicy;
  onSave: (policy: EditablePolicy) => Promise<void> | void;
  onPublish?: (policy: EditablePolicy) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [policySetId, setPolicySetId] = useState(initial?.policySetId ?? policySets[0]?.id ?? "");
  const [effect, setEffect] = useState<"Permit" | "Deny">(initial?.effect ?? "Permit");
  const [conditions, setConditions] = useState<PolicyConditions>(initial?.conditions ?? EMPTY_CONDITIONS);

  const policy: EditablePolicy = useMemo(
    () => ({ id: initial?.id, policySetId, name, description, effect, conditions, status: initial?.status }),
    [initial?.id, initial?.status, policySetId, name, description, effect, conditions]
  );

  const generatedJson = useMemo(
    () =>
      JSON.stringify(
        {
          name,
          description,
          policySetId,
          effect,
          target: conditions,
        },
        null,
        2
      ),
    [name, description, policySetId, effect, conditions]
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-gray-600">Policy Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600">Policy Set</label>
            <select
              value={policySetId}
              onChange={(e) => setPolicySetId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {policySets.map((ps) => (
                <option key={ps.id} value={ps.id}>
                  {ps.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Effect</label>
            <select
              value={effect}
              onChange={(e) => setEffect(e.target.value as "Permit" | "Deny")}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="Permit">Permit</option>
              <option value="Deny">Deny</option>
            </select>
          </div>
        </div>

        <ConditionGroupEditor
          label="Subject Conditions"
          hint="e.g. subject.persona equals procurement"
          items={conditions.subject}
          onChange={(items) => setConditions((c) => ({ ...c, subject: items }))}
        />
        <ConditionGroupEditor
          label="Resource Conditions"
          hint="e.g. resource.type equals products"
          items={conditions.resource}
          onChange={(items) => setConditions((c) => ({ ...c, resource: items }))}
        />
        <ConditionGroupEditor
          label="Action Conditions"
          hint="e.g. action equals view"
          items={conditions.action}
          onChange={(items) => setConditions((c) => ({ ...c, action: items }))}
        />
        <ConditionGroupEditor
          label="Environment Conditions"
          hint="e.g. environment.time exists"
          items={conditions.environment}
          onChange={(items) => setConditions((c) => ({ ...c, environment: items }))}
        />

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => onSave(policy)}
            className="rounded-lg bg-gray-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-gray-700"
          >
            Save
          </button>
          {onPublish && (
            <button
              onClick={() => onPublish(policy)}
              className="rounded-lg bg-green-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-green-700"
            >
              Publish
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="rounded-lg bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-100">
              Delete
            </button>
          )}
          <button onClick={onCancel} className="rounded-lg bg-white border border-gray-200 px-3.5 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-600 mb-1.5">Generated Policy JSON</p>
        <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-[11px] overflow-x-auto max-h-[560px] overflow-y-auto">
          {generatedJson}
        </pre>
      </div>
    </div>
  );
}
