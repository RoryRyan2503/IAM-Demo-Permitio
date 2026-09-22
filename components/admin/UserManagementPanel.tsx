"use client";

/**
 * UserManagementPanel — Admin Console "User Management" tab
 *
 * Backed entirely by Supabase via /api/admin/users, /api/admin/users/[id]
 * (role updates), and /api/admin/users/[id]/accounts (sold-to account
 * associations). No local mock data — all reads/writes hit the database and
 * this component reflects the persisted result.
 */

import { useEffect, useMemo, useState } from "react";
import { UserDetailDrawer } from "./UserDetailDrawer";

export interface AdminAccountRef {
  id: string;
  accountName: string;
}

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  role: "admin" | "buyer" | "viewer";
  phone: string | null;
  department: string | null;
  honId: string | null;
  userType: string | null;
  accounts: AdminAccountRef[];
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-50 text-red-700 border-red-200",
  buyer: "bg-blue-50 text-blue-700 border-blue-200",
  viewer: "bg-gray-50 text-gray-600 border-gray-200",
};

type SortKey = "name" | "role" | "accounts";
type RoleFilter = "all" | "admin" | "buyer" | "viewer";

const PAGE_SIZE = 10;

export function UserManagementPanel() {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to load users");
        return;
      }
      const data = await res.json();
      setUsers(data.data ?? []);
    } catch {
      setError("Network error while loading users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = useMemo(() => {
    let rows = users;
    if (roleFilter !== "all") rows = rows.filter((u) => u.role === roleFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.accounts.some((a) => a.accountName.toLowerCase().includes(q))
      );
    }
    const sorted = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "role") cmp = a.role.localeCompare(b.role);
      else if (sortKey === "accounts") cmp = a.accounts.length - b.accounts.length;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [users, search, roleFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selected = users.find((u) => u.id === selectedId) ?? null;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search users..."
              className="rounded-lg border border-gray-200 pl-8 pr-3 py-2 text-xs w-56 focus:border-[#C8102E]/40 focus:outline-none"
            />
          </div>
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            {(["all", "admin", "buyer", "viewer"] as const).map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRoleFilter(r);
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-[11px] font-medium capitalize transition-all ${
                  roleFilter === r ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-400">
          {isLoading ? "Loading…" : `${filtered.length} user${filtered.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <SortableHeader label="User" active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} />
              <SortableHeader label="Role" active={sortKey === "role"} dir={sortDir} onClick={() => toggleSort("role")} />
              <SortableHeader label="Sold-To Accounts" active={sortKey === "accounts"} dir={sortDir} onClick={() => toggleSort("accounts")} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-xs text-gray-400">
                  Loading users from Supabase…
                </td>
              </tr>
            )}
            {!isLoading &&
              pageRows.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setSelectedId(u.id)}
                  className="cursor-pointer hover:bg-gray-50/70 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#C8102E]/10 text-xs font-bold text-[#C8102E]">
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{u.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize border ${ROLE_COLORS[u.role]}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    {u.accounts.length === 0 ? (
                      <span className="text-gray-400">No accounts</span>
                    ) : (
                      u.accounts.map((a) => a.accountName).join(", ")
                    )}
                  </td>
                </tr>
              ))}
            {!isLoading && pageRows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-xs text-gray-400">
                  No users match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-gray-400">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-gray-600 disabled:opacity-40 hover:border-gray-300"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-gray-600 disabled:opacity-40 hover:border-gray-300"
          >
            Next
          </button>
        </div>
      </div>

      {selected && (
        <UserDetailDrawer user={selected} onClose={() => setSelectedId(null)} onChanged={loadUsers} />
      )}
    </div>
  );
}

function SortableHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <th className="text-left px-4 py-3">
      <button
        onClick={onClick}
        className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
      >
        {label}
        {active && <span>{dir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="9" cy="9" r="6" />
      <path d="M17 17l-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}
