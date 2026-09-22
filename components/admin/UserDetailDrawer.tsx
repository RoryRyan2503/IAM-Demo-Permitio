"use client";

/**
 * UserDetailDrawer — right-side drawer for a real Supabase-backed user
 *
 * Tabs: Profile (read-only CRM data), Roles (persisted via
 * PATCH /api/admin/users/[id]), Accounts (sold-to associations persisted via
 * POST/DELETE /api/admin/users/[id]/accounts), and an Authorization Preview
 * that calls /api/admin/test-access. All authorization on this screen — and
 * the mutations it triggers — is role-based only; persona is never read or
 * sent here.
 */

import { useEffect, useState } from "react";
import type { AdminAccountRef, AdminUserRecord } from "./UserManagementPanel";

const PREVIEW_CHECKS: Array<{ label: string; action: string; resource: string }> = [
  { label: "Can View Products", action: "view", resource: "products" },
  { label: "Can View Pricing", action: "view_pricing", resource: "products" },
  { label: "Can View Cart", action: "view", resource: "cart" },
  { label: "Can Place Orders", action: "create", resource: "orders" },
  { label: "Can Manage Users", action: "manage", resource: "users" },
];

type TabKey = "profile" | "roles" | "accounts" | "preview";

export function UserDetailDrawer({
  user,
  onClose,
  onChanged,
}: {
  user: AdminUserRecord;
  onClose: () => void;
  /** Called after a successful role or account-association mutation so the parent can refetch. */
  onChanged: () => void | Promise<void>;
}) {
  const [tab, setTab] = useState<TabKey>("profile");
  const [role, setRole] = useState(user.role);
  const [accounts, setAccounts] = useState<AdminAccountRef[]>(user.accounts);
  const [allAccounts, setAllAccounts] = useState<AdminAccountRef[]>([]);
  const [addAccountId, setAddAccountId] = useState("");
  const [savingRole, setSavingRole] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Record<string, { decision: boolean; reason?: string; engine: string } | null>>({});
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    setRole(user.role);
    setAccounts(user.accounts);
    setMutationError(null);
  }, [user]);

  useEffect(() => {
    if (tab !== "accounts" || allAccounts.length > 0) return;
    fetch("/api/admin/accounts")
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((data) => setAllAccounts(data.data ?? []))
      .catch(() => setAllAccounts([]));
  }, [tab, allAccounts.length]);

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
              userId: user.id,
              role,
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
  }, [tab, user.id, role]);

  const handleRoleSave = async (newRole: "admin" | "buyer" | "viewer") => {
    setSavingRole(true);
    setMutationError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMutationError(data.error ?? "Failed to update role");
        return;
      }
      setRole(newRole);
      await onChanged();
    } catch {
      setMutationError("Network error while updating role");
    } finally {
      setSavingRole(false);
    }
  };

  const handleAddAccount = async () => {
    if (!addAccountId) return;
    setMutationError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: addAccountId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMutationError(data.error ?? "Failed to add account association");
        return;
      }
      setAccounts((prev) => [...prev, { id: data.data.accountId, accountName: data.data.accountName }]);
      setAddAccountId("");
      await onChanged();
    } catch {
      setMutationError("Network error while adding account association");
    }
  };

  const handleRemoveAccount = async (accountId: string) => {
    setMutationError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/accounts?accountId=${encodeURIComponent(accountId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMutationError(data.error ?? "Failed to remove account association");
        return;
      }
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
      await onChanged();
    } catch {
      setMutationError("Network error while removing account association");
    }
  };

  const availableToAdd = allAccounts.filter((a) => !accounts.some((existing) => existing.id === a.id));

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg h-full bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#C8102E]/10 text-sm font-bold text-[#C8102E]">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-100 px-4 pt-2 overflow-x-auto">
          {([
            ["profile", "Profile"],
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
          {mutationError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {mutationError}
            </div>
          )}

          {tab === "profile" && (
            <div className="space-y-3">
              <ReadOnlyField label="Name" value={user.name} />
              <ReadOnlyField label="Email" value={user.email} />
              <ReadOnlyField label="Department" value={user.department ?? "—"} />
              <ReadOnlyField label="Phone" value={user.phone ?? "—"} />
              <ReadOnlyField label="HON ID" value={user.honId ?? "—"} />
              <ReadOnlyField label="User Type" value={user.userType ?? "—"} />
              <p className="text-[11px] text-gray-400 leading-snug pt-1">
                Profile fields are sourced from Supabase and are read-only here.
              </p>
            </div>
          )}

          {tab === "roles" && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Role</p>
              <div className="grid grid-cols-3 gap-2">
                {(["viewer", "buyer", "admin"] as const).map((r) => (
                  <button
                    key={r}
                    disabled={savingRole}
                    onClick={() => handleRoleSave(r)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition-colors disabled:opacity-50 ${
                      role === r
                        ? "border-[#C8102E] bg-[#C8102E]/5 text-[#C8102E]"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 leading-snug">
                Role changes are persisted immediately to Supabase (users.role) and take
                effect for future authorization decisions. Authorization here is
                role-based only — persona is never used to gate this action.
              </p>
            </div>
          )}

          {tab === "accounts" && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Sold-To Accounts</p>
              <div className="space-y-2">
                {accounts.map((acc) => (
                  <div key={acc.id} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                    <span className="flex-1 text-xs font-medium text-gray-800">{acc.accountName}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{acc.id}</span>
                    <button
                      onClick={() => handleRemoveAccount(acc.id)}
                      className="text-gray-300 hover:text-red-500"
                      aria-label={`Remove ${acc.accountName}`}
                    >
                      <CloseIcon />
                    </button>
                  </div>
                ))}
                {accounts.length === 0 && (
                  <p className="text-[11px] text-gray-400">No sold-to accounts associated yet.</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={addAccountId}
                  onChange={(e) => setAddAccountId(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs"
                >
                  <option value="">Select an account to add…</option>
                  {availableToAdd.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountName} ({a.id})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddAccount}
                  disabled={!addAccountId}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-gray-600 disabled:opacity-40 hover:border-[#C8102E]/40 hover:text-[#C8102E]"
                >
                  Add Account
                </button>
              </div>
              <p className="text-[11px] text-gray-400 leading-snug">
                Associations are persisted immediately to Supabase (user_accounts).
                Duplicate associations are rejected by the database's primary key
                constraint.
              </p>
            </div>
          )}

          {tab === "preview" && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 mb-2">
                Evaluated live from the active authorization provider (PingAuthorize) for role{" "}
                <span className="font-semibold capitalize">{role}</span>.
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
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{label}</label>
      <p className="mt-1 w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700">
        {value}
      </p>
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
