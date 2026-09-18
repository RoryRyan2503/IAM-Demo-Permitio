"use client";

/**
 * UserDetailDrawer — right-side drawer for a demo user
 *
 * Tabs: Profile, Attributes, Roles, Accounts, Authorization Preview.
 * The Authorization Preview tab calls /api/admin/test-access so the
 * displayed decisions come from the live PingAuthorize provider rather
 * than a hardcoded role check.
 */

import { useEffect, useState } from "react";
import type { DemoUserRecord } from "./UserManagementPanel";

const PREVIEW_CHECKS: Array<{ label: string; action: string; resource: string }> = [
  { label: "Can View Products", action: "view", resource: "products" },
  { label: "Can View Pricing", action: "view_pricing", resource: "products" },
  { label: "Can View Cart", action: "view", resource: "cart" },
  { label: "Can Place Orders", action: "create", resource: "orders" },
  { label: "Can Manage Users", action: "manage", resource: "users" },
];

type TabKey = "profile" | "attributes" | "roles" | "accounts" | "preview";

export function UserDetailDrawer({
  user,
  onClose,
  onSave,
}: {
  user: DemoUserRecord;
  onClose: () => void;
  onSave: (updated: DemoUserRecord) => void;
}) {
  const [tab, setTab] = useState<TabKey>("profile");
  const [draft, setDraft] = useState<DemoUserRecord>(user);
  const [customAttrs, setCustomAttrs] = useState<Array<{ key: string; value: string }>>(
    Object.entries(user.customAttributes ?? {}).map(([key, value]) => ({ key, value }))
  );
  const [preview, setPreview] = useState<Record<string, { decision: boolean; reason?: string; engine: string } | null>>({});
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    setDraft(user);
    setCustomAttrs(Object.entries(user.customAttributes ?? {}).map(([key, value]) => ({ key, value })));
  }, [user]);

  useEffect(() => {
    if (tab !== "preview") return;
    let cancelled = false;
    setPreviewLoading(true);
    (async () => {
      const results: typeof preview = {};
      for (const check of PREVIEW_CHECKS) {
        try {
          const res = await fetch("/api/admin/test-access", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: draft.id,
              role: draft.role,
              persona: draft.persona,
              resource: check.resource,
              action: check.action,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const r = data.results?.[0];
            results[check.label] = { decision: !!r?.allowed, reason: r?.reason, engine: r?.engine ?? "ping" };
          } else {
            results[check.label] = null;
          }
        } catch {
          results[check.label] = null;
        }
      }
      if (!cancelled) {
        setPreview(results);
        setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, draft.id, draft.role, draft.persona]);

  const handleSave = () => {
    const customAttributes = Object.fromEntries(
      customAttrs.filter((a) => a.key.trim() !== "").map((a) => [a.key.trim(), a.value])
    );
    onSave({ ...draft, customAttributes });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg h-full bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#C8102E]/10 text-sm font-bold text-[#C8102E]">
            {draft.firstName.charAt(0)}
            {draft.lastName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {draft.firstName} {draft.lastName}
            </p>
            <p className="text-xs text-gray-500 truncate">{draft.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-100 px-4 pt-2 overflow-x-auto">
          {([
            ["profile", "Profile"],
            ["attributes", "Attributes"],
            ["roles", "Roles"],
            ["accounts", "Accounts"],
            ["preview", "Authorization Preview"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`shrink-0 rounded-t-lg px-3 py-2 text-xs font-medium transition-colors ${
                tab === key ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {tab === "profile" && (
            <div className="space-y-3">
              <Field label="First Name" value={draft.firstName} onChange={(v) => setDraft({ ...draft, firstName: v })} />
              <Field label="Last Name" value={draft.lastName} onChange={(v) => setDraft({ ...draft, lastName: v })} />
              <Field label="Email" value={draft.email} onChange={(v) => setDraft({ ...draft, email: v })} />
              <Field label="Company" value={draft.company} onChange={(v) => setDraft({ ...draft, company: v })} />
            </div>
          )}

          {tab === "attributes" && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Business Attributes</p>
                <div className="space-y-3">
                  <Field label="Sales Organization" value={draft.salesOrg} onChange={(v) => setDraft({ ...draft, salesOrg: v })} />
                  <Field label="Region" value={draft.region} onChange={(v) => setDraft({ ...draft, region: v })} />
                  <Field label="Country" value={draft.country} onChange={(v) => setDraft({ ...draft, country: v })} />
                  <Field label="User Type" value={draft.userType} onChange={(v) => setDraft({ ...draft, userType: v })} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Custom Attributes</p>
                  <button
                    onClick={() => setCustomAttrs([...customAttrs, { key: "", value: "" }])}
                    className="text-[11px] font-medium text-[#C8102E] hover:underline"
                  >
                    + Add attribute
                  </button>
                </div>
                <div className="space-y-2">
                  {customAttrs.map((attr, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        value={attr.key}
                        placeholder="key"
                        onChange={(e) => {
                          const next = [...customAttrs];
                          next[idx] = { ...next[idx], key: e.target.value };
                          setCustomAttrs(next);
                        }}
                        className="w-1/2 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-mono"
                      />
                      <input
                        value={attr.value}
                        placeholder="value"
                        onChange={(e) => {
                          const next = [...customAttrs];
                          next[idx] = { ...next[idx], value: e.target.value };
                          setCustomAttrs(next);
                        }}
                        className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-mono"
                      />
                      <button
                        onClick={() => setCustomAttrs(customAttrs.filter((_, i) => i !== idx))}
                        className="text-gray-300 hover:text-red-500"
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  ))}
                  {customAttrs.length === 0 && (
                    <p className="text-[11px] text-gray-400">No custom attributes yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === "roles" && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Role</p>
              <div className="grid grid-cols-3 gap-2">
                {(["viewer", "buyer", "admin"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setDraft({ ...draft, role: r })}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition-colors ${
                      draft.role === r
                        ? "border-[#C8102E] bg-[#C8102E]/5 text-[#C8102E]"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 leading-snug">
                Role changes take effect immediately for future authorization decisions
                (evaluated live via PingAuthorize).
              </p>
            </div>
          )}

          {tab === "accounts" && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Associated Accounts</p>
              <div className="space-y-2">
                {draft.accounts.map((acc, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                    <span className="flex-1 text-xs font-medium text-gray-800">{acc}</span>
                    {idx === 0 && (
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        Primary
                      </span>
                    )}
                    {idx !== 0 && (
                      <button
                        onClick={() => {
                          const accounts = [acc, ...draft.accounts.filter((_, i) => i !== idx)];
                          setDraft({ ...draft, accounts });
                        }}
                        className="text-[10px] font-medium text-gray-400 hover:text-gray-700"
                      >
                        Make primary
                      </button>
                    )}
                    <button
                      onClick={() => setDraft({ ...draft, accounts: draft.accounts.filter((_, i) => i !== idx) })}
                      className="text-gray-300 hover:text-red-500"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                ))}
              </div>
              <AddAccountRow onAdd={(name) => setDraft({ ...draft, accounts: [...draft.accounts, name] })} />
            </div>
          )}

          {tab === "preview" && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 mb-2">
                Evaluated live from the active authorization provider (PingAuthorize) for role{" "}
                <span className="font-semibold capitalize">{draft.role}</span>.
              </p>
              {previewLoading ? (
                <div className="flex items-center gap-2 text-xs text-gray-400 py-6 justify-center">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#C8102E] border-t-transparent" />
                  Evaluating policies...
                </div>
              ) : (
                PREVIEW_CHECKS.map((check) => {
                  const result = preview[check.label];
                  const allowed = result?.decision ?? false;
                  return (
                    <div
                      key={check.label}
                      className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5"
                    >
                      <div>
                        <p className="text-xs font-medium text-gray-800">{check.label}</p>
                        {result?.reason && <p className="text-[10px] text-gray-400 mt-0.5">{result.reason}</p>}
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          result === null
                            ? "bg-gray-100 text-gray-400"
                            : allowed
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {result === null ? "N/A" : allowed ? "YES" : "NO"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-[#C8102E] px-4 py-2 text-xs font-medium text-white hover:bg-[#a80d26] transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-[#C8102E]/40 focus:outline-none"
      />
    </div>
  );
}

function AddAccountRow({ onAdd }: { onAdd: (name: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="New account name"
        className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs"
      />
      <button
        onClick={() => {
          if (!value.trim()) return;
          onAdd(value.trim());
          setValue("");
        }}
        className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-gray-600 hover:border-[#C8102E]/40 hover:text-[#C8102E]"
      >
        Add Account
      </button>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
        clipRule="evenodd"
      />
    </svg>
  );
}
