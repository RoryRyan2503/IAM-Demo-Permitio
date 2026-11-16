"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import type { DynamoAdminUser } from "@/lib/crm/dynamoAdminUsers";
import { Button } from "@/components/ui/button";

type AccountRef = DynamoAdminUser["accounts"][number];
const ROLE_OPTIONS = ["Admin", "Buyer", "Approver", "Purchasing", "Technician", "Technical Support Only"];
const PAGE_SIZE = 10;

export function DynamoUserManagementPanel() {
  const [users, setUsers] = useState<DynamoAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/dynamo-users");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Failed to load DynamoDB users");
      setUsers(result.data);
    } catch (failure) {
      setUsers([]);
      setError(failure instanceof Error ? failure.message : "Failed to load DynamoDB users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadUsers(); }, []);

  const query = search.trim().toLowerCase();
  const filtered = users.filter((user) =>
    [user.name, user.email, user.id, user.honId, user.sbg, ...user.accounts.map((account) => account.id)]
      .some((value) => value.toLowerCase().includes(query))
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const selected = users.find((user) => user.id === selectedId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input aria-label="Search DynamoDB users" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Search DynamoDB users..." className="w-60 rounded-md border border-gray-200 py-2 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
        </div>
        <span className="text-xs text-gray-500">{loading ? "Loading..." : `${filtered.length} users`}</span>
      </div>
      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-gray-200 bg-gray-50 text-gray-500"><tr>
            <th className="p-3">User</th><th className="p-3">Role</th><th className="p-3">SBG</th><th className="p-3">Sold-To Accounts</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={4} className="p-8 text-center text-gray-500">Loading DynamoDB users...</td></tr> :
              filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((user) => (
                <tr key={user.id} onClick={() => setSelectedId(user.id)} className="cursor-pointer hover:bg-gray-50">
                  <td className="p-3"><strong className="block text-gray-900">{user.name}</strong><span className="text-gray-500">{user.email}</span></td>
                  <td className="p-3">{user.role || "-"}</td><td className="p-3">{user.sbg || "-"}</td>
                  <td className="p-3">{user.accounts.length ? user.accounts.map((account) => account.accountName).join(", ") : "No accounts"}</td>
                </tr>
              ))}
            {!loading && !filtered.length && <tr><td colSpan={4} className="p-8 text-center text-gray-500">No DynamoDB users found.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Page {page} of {pages}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
          <Button variant="outline" size="sm" disabled={page === pages} onClick={() => setPage((current) => current + 1)}>Next</Button>
        </div>
      </div>
      {selected && <DynamoUserDrawer key={selected.id} user={selected} onClose={() => setSelectedId(null)} onChanged={loadUsers} />}
    </div>
  );
}

function DynamoUserDrawer({ user, onClose, onChanged }: { user: DynamoAdminUser; onClose: () => void; onChanged: () => Promise<void> }) {
  const [tab, setTab] = useState<"profile" | "role" | "accounts">("profile");
  const [role, setRole] = useState(user.role);
  const [accounts, setAccounts] = useState(user.accounts);
  const [availableAccounts, setAvailableAccounts] = useState<AccountRef[]>([]);
  const [addId, setAddId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (tab !== "accounts") return;
    fetch("/api/admin/dynamo-users/sold-tos")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Failed to load Sold-To accounts");
        setAvailableAccounts(data.data);
      })
      .catch((failure) => setError(failure instanceof Error ? failure.message : "Failed to load Sold-To accounts"));
  }, [tab]);

  async function mutate(url: string, method: "PATCH" | "POST" | "DELETE", body?: object) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to save change");
      await onChanged();
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to save change");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const base = `/api/admin/dynamo-users/${encodeURIComponent(user.id)}`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Manage ${user.name}`}>
      <button type="button" aria-label="Close user details" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-gray-200 p-5">
          <div><h3 className="text-base font-semibold text-gray-900">{user.name}</h3><p className="text-xs text-gray-500">{user.email}</p><p className="mt-1 text-xs text-gray-500">DynamoDB</p></div>
          <button aria-label="Close" onClick={onClose} className="p-1 text-gray-500 hover:text-gray-900"><X className="h-5 w-5" /></button>
        </header>
        <div className="flex border-b border-gray-200 px-4" role="tablist" aria-label="User details">
          {(["profile", "role", "accounts"] as const).map((option) => (
            <button key={option} role="tab" aria-selected={tab === option} onClick={() => { setTab(option); setError(""); }}
              className={`px-4 py-3 text-xs font-semibold capitalize ${tab === option ? "border-b-2 border-[#C8102E] text-[#C8102E]" : "text-gray-500"}`}>{option === "accounts" ? "Sold-To Accounts" : option}</button>
          ))}
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5 text-sm">
          {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{error}</p>}
          {tab === "profile" && <dl className="grid grid-cols-[110px_1fr] gap-3 text-xs"><dt className="text-gray-500">User ID</dt><dd className="break-all">{user.id}</dd><dt className="text-gray-500">HON ID</dt><dd>{user.honId || "-"}</dd><dt className="text-gray-500">User Type</dt><dd>{user.userType || "-"}</dd><dt className="text-gray-500">SBG</dt><dd>{user.sbg || "-"}</dd></dl>}
          {tab === "role" && <div className="space-y-3">
            <label htmlFor="dynamo-role" className="block text-xs font-semibold text-gray-600">User Role</label>
            <select id="dynamo-role" value={role} onChange={(event) => setRole(event.target.value)} disabled={busy} className="w-full rounded-md border border-gray-200 p-2 text-sm">
              {!ROLE_OPTIONS.includes(role) && <option value={role}>{role || "Unassigned"}</option>}
              {ROLE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <Button disabled={busy || role === user.role} onClick={async () => { await mutate(base, "PATCH", { role }); }}>Save Role</Button>
          </div>}
          {tab === "accounts" && <div className="space-y-4">
            <div className="space-y-2">{accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between gap-3 rounded-md border border-gray-200 p-3 text-xs">
                <span>{account.accountName}</span>
                <button aria-label={`Remove ${account.accountName}`} disabled={busy} className="text-red-700 disabled:opacity-50" onClick={async () => {
                  if (await mutate(`${base}/sold-tos?soldToId=${encodeURIComponent(account.id)}`, "DELETE")) setAccounts((current) => current.filter((item) => item.id !== account.id));
                }}><X className="h-4 w-4" /></button>
              </div>
            ))}{!accounts.length && <p className="text-xs text-gray-500">No active Sold-To accounts.</p>}</div>
            <div className="flex gap-2">
              <select aria-label="Sold-To account to add" value={addId} onChange={(event) => setAddId(event.target.value)} className="min-w-0 flex-1 rounded-md border border-gray-200 p-2 text-xs">
                <option value="">Select Sold-To</option>
                {availableAccounts.filter((account) => !accounts.some((item) => item.id === account.id)).map((account) => <option key={account.id} value={account.id}>{account.accountName}</option>)}
              </select>
              <Button disabled={!addId || busy} onClick={async () => {
                if (await mutate(`${base}/sold-tos`, "POST", { soldToId: addId })) {
                  setAccounts((current) => [...current, availableAccounts.find((account) => account.id === addId)!]);
                  setAddId("");
                }
              }}>Add</Button>
            </div>
          </div>}
        </div>
      </div>
    </div>
  );
}