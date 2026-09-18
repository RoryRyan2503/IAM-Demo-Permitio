"use client";

/**
 * UserManagementPanel — Admin Console "User Management" tab
 *
 * Demo-scoped user administration: search, sort, quick filters, pagination,
 * and a detail drawer for editing identity / authorization / business /
 * custom attributes. Changes are held in local state (demo environment —
 * no persistence layer for user records yet) but role changes are reflected
 * immediately in the Authorization Preview, which is evaluated live via
 * PingAuthorize (/api/admin/test-access).
 */

import { useMemo, useState } from "react";
import { UserDetailDrawer } from "./UserDetailDrawer";

export interface DemoUserRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "admin" | "buyer" | "viewer";
  persona: string;
  userType: string;
  company: string;
  salesOrg: string;
  region: string;
  country: string;
  accounts: string[];
  status: "Active" | "Inactive";
  customAttributes?: Record<string, string>;
}

const INITIAL_USERS: DemoUserRecord[] = [
  {
    id: "user-admin",
    firstName: "Miguel",
    lastName: "Patel",
    email: "miguel.patel@honeywell.com",
    role: "admin",
    persona: "GBE",
    userType: "Internal",
    company: "Honeywell Corporate",
    salesOrg: "8421",
    region: "AMER",
    country: "USA",
    accounts: ["Honeywell Corporate"],
    status: "Active",
    customAttributes: { department: "IT Administration", costCenter: "1001" },
  },
  {
    id: "user-buyer",
    firstName: "Carlos",
    lastName: "Rodriguez",
    email: "carlos.rodriguez@acme.com",
    role: "buyer",
    persona: "procurement",
    userType: "Customer",
    company: "Acme Industries",
    salesOrg: "8421",
    region: "AMER",
    country: "USA",
    accounts: ["Acme Industries", "Acme Europe", "Acme Asia"],
    status: "Active",
    customAttributes: { department: "procurement", businessUnit: "aerospace" },
  },
  {
    id: "user-viewer",
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@globalmfg.com",
    role: "viewer",
    persona: "general",
    userType: "Customer",
    company: "Global Manufacturing",
    salesOrg: "3050",
    region: "EMEA",
    country: "Germany",
    accounts: ["Global Manufacturing"],
    status: "Active",
  },
];

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-50 text-red-700 border-red-200",
  buyer: "bg-blue-50 text-blue-700 border-blue-200",
  viewer: "bg-gray-50 text-gray-600 border-gray-200",
};

type SortKey = "name" | "role" | "company" | "status";
type RoleFilter = "all" | "admin" | "buyer" | "viewer";

const PAGE_SIZE = 10;

export function UserManagementPanel() {
  const [users, setUsers] = useState<DemoUserRecord[]>(INITIAL_USERS);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<DemoUserRecord | null>(null);

  const filtered = useMemo(() => {
    let rows = users;
    if (roleFilter !== "all") rows = rows.filter((u) => u.role === roleFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (u) =>
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.company.toLowerCase().includes(q)
      );
    }
    const sorted = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      else if (sortKey === "role") cmp = a.role.localeCompare(b.role);
      else if (sortKey === "company") cmp = a.company.localeCompare(b.company);
      else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [users, search, roleFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleSave = (updated: DemoUserRecord) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
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
        <p className="text-xs text-gray-400">{filtered.length} user{filtered.length === 1 ? "" : "s"}</p>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <SortableHeader label="User" active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} />
              <SortableHeader label="Role" active={sortKey === "role"} dir={sortDir} onClick={() => toggleSort("role")} />
              <SortableHeader label="Account" active={sortKey === "company"} dir={sortDir} onClick={() => toggleSort("company")} />
              <SortableHeader label="Status" active={sortKey === "status"} dir={sortDir} onClick={() => toggleSort("status")} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageRows.map((u) => (
              <tr
                key={u.id}
                onClick={() => setSelected(u)}
                className="cursor-pointer hover:bg-gray-50/70 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#C8102E]/10 text-xs font-bold text-[#C8102E]">
                      {u.firstName.charAt(0)}
                      {u.lastName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize border ${ROLE_COLORS[u.role]}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-700">{u.company}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {u.status}
                  </span>
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-xs text-gray-400">
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
        <UserDetailDrawer user={selected} onClose={() => setSelected(null)} onSave={handleSave} />
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
