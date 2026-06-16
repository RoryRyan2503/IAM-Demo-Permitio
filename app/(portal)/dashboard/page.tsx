"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAccountContext } from "@/context/AccountContext";
import { getSalesOrgStyle } from "@/lib/utils";

interface DashOrder {
  id: string;
  account_id: string;
  user_id: string;
  status: string;
  total: number;
  created_at: string;
  order_items: { id: string; product_name: string; quantity: number; unit_price: number }[];
}

const STATUS_STYLE: Record<string, { dot: string; bg: string; text: string }> = {
  delivered:  { dot: "bg-green-500",  bg: "bg-green-50",  text: "text-green-700" },
  shipped:    { dot: "bg-blue-500",   bg: "bg-blue-50",   text: "text-blue-700" },
  processing: { dot: "bg-amber-500", bg: "bg-amber-50",  text: "text-amber-700" },
  confirmed:  { dot: "bg-indigo-500", bg: "bg-indigo-50", text: "text-indigo-700" },
  pending:    { dot: "bg-gray-400",   bg: "bg-gray-50",   text: "text-gray-600" },
  cancelled:  { dot: "bg-red-500",    bg: "bg-red-50",    text: "text-red-700" },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { userContext, selectedAccount, availableAccounts } = useAccountContext();
  const [orders, setOrders] = useState<DashOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const crmUser = userContext?.user;
  const activeSalesArea = userContext?.activeSalesArea;

  useEffect(() => {
    fetch("/api/dashboard/orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.data ?? []))
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, []);

  // Aggregate stats from orders
  const ordersByStatus = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});
  const totalOrderValue = orders.reduce((s, o) => s + o.total, 0);

  // Map account_id → account name from the user's accounts
  const accountMap = new Map(
    (crmUser?.accounts ?? []).map((a) => [a.accountId, a])
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── Header ───────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Account Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Welcome back,{" "}
            <span className="text-[#C8102E] font-medium">{user?.name?.split(" ")[0]}</span>
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-xl border border-[#C8102E]/20 bg-[#C8102E]/5 px-3 py-2">
          <div className="h-2 w-2 rounded-full bg-[#C8102E] animate-pulse" />
          <span className="text-xs font-medium text-[#C8102E]">Authenticated</span>
        </div>
      </div>

      {/* ── Quick Stats ──────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Accounts" value={String(availableAccounts.length)} icon={<BuildingIcon />} color="red" />
        <StatCard label="Total Orders" value={String(orders.length)} icon={<ClipIcon />} color="blue" />
        <StatCard label="Order Value" value={`$${(totalOrderValue / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`} icon={<CurrencyIcon />} color="green" />
        <StatCard label="Sales Orgs" value={String(new Set((crmUser?.accounts ?? []).flatMap((a) => a.salesOrgs)).size)} icon={<GlobeIcon />} color="purple" />
      </div>

      {/* ── User Profile + Active Account ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* User profile card */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4">
            User Profile
          </p>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#C8102E]/10 text-xl font-bold text-[#C8102E]">
              {user?.name?.charAt(0) ?? "?"}
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">{crmUser?.name ?? user?.name}</p>
              <p className="text-xs text-gray-500">{crmUser?.email ?? user?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize border ${
                  crmUser?.role === "admin" ? "border-red-200 bg-red-50 text-red-700"
                  : crmUser?.role === "buyer" ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-gray-50 text-gray-600"
                }`}>
                  {crmUser?.role ?? user?.role}
                </span>
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-500 capitalize">
                  {crmUser?.userType ?? "—"}
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <InfoCell label="HON ID" value={crmUser?.honId ?? "—"} />
            <InfoCell label="Contact ID" value={crmUser?.contactId ?? "—"}/>
            <InfoCell label="Phone" value={crmUser?.phone ?? "—"} />
            <InfoCell label="Department" value={crmUser?.department ?? "—"} />
            <InfoCell label="Persona" value={crmUser?.persona ?? "—"} />
            <InfoCell label="Super User" value={crmUser?.isSuperUser ? "Yes" : "No"} />
          </div>
        </div>

        {/* Active account card */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Active Account (Sold-To)
          </p>
          {selectedAccount ? (
            <>
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#C8102E]/10 text-sm font-bold text-[#C8102E]">
                    {selectedAccount.accountName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{selectedAccount.accountName}</p>
                    <p className="text-[11px] text-gray-400 font-mono">
                      {selectedAccount.accountNumber} · {selectedAccount.accountId}
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <InfoCell label="Account Type" value={selectedAccount.accountType ?? "—"} />
                <InfoCell label="ERP" value={selectedAccount.erpNumber ?? "—"} mono />
                <InfoCell label="Line of Business" value={selectedAccount.lineOfBusiness?.join(", ") ?? "—"} span2 />
              </div>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                Sales Areas ({selectedAccount.salesOrgList?.length ?? 0})
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {selectedAccount.salesOrgList?.map((sa) => {
                  const orgStyle = getSalesOrgStyle(sa.salesOrg);
                  const isActive = activeSalesArea === sa.salesArea;
                  return (
                    <div
                      key={sa.salesArea}
                      className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs ${
                        isActive ? `${orgStyle.border} ${orgStyle.bg}` : "border-gray-100 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: orgStyle.hex }} />
                        <span className="font-mono font-medium text-gray-700">{sa.salesArea}</span>
                        <span className={`text-[10px] ${orgStyle.text}`}>{orgStyle.label}</span>
                        {isActive && (
                          <span className="text-[9px] font-semibold bg-white/80 border border-current rounded px-1 py-0.5">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-gray-400 text-[11px]">
                        <span className="font-mono">{sa.currency}</span>
                        <span className="text-gray-300">·</span>
                        <span>Div {sa.division}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400">No account selected</p>
          )}
        </div>
      </div>

      {/* ── All Accounts ────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
            All Associated Accounts ({availableAccounts.length})
          </p>
        </div>
        <div className="space-y-2">
          {(crmUser?.accounts ?? []).map((acct) => {
            const isActive = selectedAccount?.accountId === acct.accountId;
            return (
              <div
                key={acct.accountId}
                className={`rounded-lg border p-3 transition-colors ${
                  isActive ? "border-[#C8102E]/30 bg-[#C8102E]/5" : "border-gray-100 bg-gray-50 hover:bg-gray-100/50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                      isActive ? "bg-[#C8102E]/10 text-[#C8102E]" : "bg-gray-200 text-gray-600"
                    }`}>
                      {acct.accountName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-800">{acct.accountName}</p>
                        {isActive && (
                          <span className="rounded-full border border-[#C8102E]/30 bg-[#C8102E]/10 px-2 py-0.5 text-[9px] font-semibold text-[#C8102E]">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 font-mono">{acct.accountNumber} · {acct.accountType}</p>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-gray-400">ERP</p>
                    <p className="text-[11px] font-mono text-gray-600">{acct.erpNumber}</p>
                  </div>
                </div>
                {/* Sales orgs for this account */}
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {acct.salesOrgList?.map((sa) => {
                    const orgStyle = getSalesOrgStyle(sa.salesOrg);
                    return (
                      <span
                        key={sa.salesArea}
                        className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-mono ${orgStyle.border} ${orgStyle.bg}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: orgStyle.hex }} />
                        <span className={orgStyle.text}>{sa.salesOrg}</span>
                        <span className="text-gray-400">{sa.currency}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Recent Orders ────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-800">Recent Orders</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Across all your accounts</p>
          </div>
          {/* Status breakdown pills */}
          <div className="hidden md:flex gap-1.5">
            {Object.entries(ordersByStatus).map(([status, count]) => {
              const s = STATUS_STYLE[status] ?? STATUS_STYLE.pending;
              return (
                <span key={status} className={`inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-medium ${s.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                  {count} {status}
                </span>
              );
            })}
          </div>
        </div>
        {ordersLoading ? (
          <div className="p-8 flex justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#C8102E] border-t-transparent" />
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No orders found</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {orders.slice(0, 10).map((order) => {
              const s = STATUS_STYLE[order.status] ?? STATUS_STYLE.pending;
              const acctName = accountMap.get(order.account_id)?.accountName ?? order.account_id;
              return (
                <div key={order.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/50 transition-colors">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${s.bg}`}>
                    <div className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {order.order_items?.[0]?.product_name ?? "Order"}
                        {(order.order_items?.length ?? 0) > 1 && (
                          <span className="text-gray-400 font-normal"> +{order.order_items.length - 1} more</span>
                        )}
                      </p>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {acctName} · {new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-semibold text-gray-800">
                      ${(order.total / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${s.bg} ${s.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                    {order.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Authorization Summary ────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#C8102E]/10">
            <svg className="h-4 w-4 text-[#C8102E]" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800 mb-1">
              Honeywell Unified Authorization Fabric
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">
              <strong>Ping Identity</strong> (JWT) → <strong>CRM</strong> (tool grants + sales areas) → <strong>Permit.io</strong> (policy engine).
              All data on this dashboard is dynamically resolved from your CRM profile and Supabase backend.
            </p>
            {(userContext?.approvedToolIds ?? []).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {(userContext?.approvedToolIds ?? []).map((tid) => (
                  <span key={tid} className="rounded-md bg-gray-100 border border-gray-200 px-1.5 py-0.5 text-[10px] font-mono text-gray-600">
                    {tid}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function InfoCell({ label, value, mono = false, span2 = false }: { label: string; value: string; mono?: boolean; span2?: boolean }) {
  return (
    <div className={`rounded-lg bg-gray-50 border border-gray-100 px-2.5 py-2 ${span2 ? "col-span-2" : ""}`}>
      <p className="text-[9px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`truncate text-gray-700 mt-0.5 ${mono ? "font-mono text-[10px]" : "text-xs font-medium capitalize"}`}>
        {value}
      </p>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: "red" | "blue" | "green" | "purple" }) {
  const styles = {
    red: "border-red-100 bg-red-50",
    blue: "border-blue-100 bg-blue-50",
    green: "border-green-100 bg-green-50",
    purple: "border-purple-100 bg-purple-50",
  };
  const iconStyles = {
    red: "text-[#C8102E]",
    blue: "text-blue-600",
    green: "text-green-600",
    purple: "text-purple-600",
  };
  return (
    <div className={`rounded-xl border p-4 ${styles[color]}`}>
      <div className={`mb-2 ${iconStyles[color]}`}>{icon}</div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────

function BuildingIcon() { return <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" /></svg>; }
function ClipIcon()     { return <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>; }
function CurrencyIcon() { return <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" /></svg>; }
function GlobeIcon()    { return <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" /></svg>; }
