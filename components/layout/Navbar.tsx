"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useAccountContext } from "@/context/AccountContext";
import { getSalesOrgStyle } from "@/lib/utils";

export function Navbar() {
  const { user, logout, authEngine, dataSource } = useAuth();
  const { selectedAccount, availableAccounts, switchAccount, isLoading, userContext } =
    useAccountContext();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  // Close account dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setAccountDropdownOpen(false);
      }
    }
    if (accountDropdownOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [accountDropdownOpen]);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-white px-5 lg:px-7 gap-4">
      {/* ── Left: Sold-to selector ── */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile hamburger placeholder */}
        <button className="md:hidden p-1 text-gray-400">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Modern Sold-to Dropdown */}
        {availableAccounts.length > 0 && (
          <div className="relative" ref={accountDropdownRef}>
            <button
              onClick={() => setAccountDropdownOpen((v) => !v)}
              disabled={isLoading}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white pl-3 pr-3 py-2 hover:border-gray-300 hover:shadow-sm transition-all disabled:opacity-50 min-w-[180px] max-w-[260px]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#C8102E] to-[#e8384f] text-[10px] font-bold text-white">
                {selectedAccount?.accountName?.charAt(0) ?? "?"}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Selected Account</span>
                <p className="text-xs font-semibold text-gray-800 truncate leading-tight mt-0.5">
                  {selectedAccount?.accountName ?? "Select account"}
                </p>
              </div>
              <div className="shrink-0 ml-1">
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#C8102E] border-t-transparent" />
                ) : (
                  <svg className={`h-4 w-4 text-gray-400 transition-transform ${accountDropdownOpen ? "rotate-180" : ""}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </button>

            {/* Dropdown panel */}
            {accountDropdownOpen && (
              <div className="absolute left-0 top-full mt-2 z-30 w-[340px] rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
                <div className="px-3 pt-3 pb-2">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-1">
                    Switch Account ({availableAccounts.length})
                  </p>
                </div>
                <div className="max-h-[320px] overflow-y-auto px-2 pb-2 space-y-0.5">
                  {availableAccounts.map((acc) => {
                    const isActive = acc.accountId === selectedAccount?.accountId;
                    return (
                      <button
                        key={acc.accountId}
                        onClick={() => {
                          switchAccount(acc.accountId);
                          setAccountDropdownOpen(false);
                        }}
                        className={`w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
                          isActive
                            ? "bg-[#C8102E]/5 border border-[#C8102E]/20"
                            : "hover:bg-gray-50 border border-transparent"
                        }`}
                      >
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                          isActive ? "bg-[#C8102E] text-white" : "bg-gray-100 text-gray-500"
                        }`}>
                          {acc.accountName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-xs font-semibold truncate ${isActive ? "text-[#C8102E]" : "text-gray-800"}`}>
                              {acc.accountName}
                            </p>
                            {isActive && (
                              <span className="shrink-0 flex items-center gap-1 rounded-full bg-[#C8102E]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#C8102E]">
                                <div className="h-1.5 w-1.5 rounded-full bg-[#C8102E]" />
                                Active
                              </span>
                            )}
                          </div>
                          {acc.salesOrgList && acc.salesOrgList.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {acc.salesOrgList.slice(0, 4).map((sa) => {
                                const style = getSalesOrgStyle(sa.salesOrg);
                                return (
                                  <span
                                    key={sa.salesArea}
                                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-mono border"
                                    style={{ borderColor: style.hex + "30", backgroundColor: style.hex + "08", color: style.hex }}
                                  >
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: style.hex }} />
                                    {sa.salesOrg}
                                  </span>
                                );
                              })}
                              {acc.salesOrgList.length > 4 && (
                                <span className="text-[9px] text-gray-400 self-center">+{acc.salesOrgList.length - 4}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Right: user menu ── */}
      {user && (
        <div className="relative flex items-center gap-3">
          {authEngine === "permit.io" ? (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Permit.io
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 border border-amber-200">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Local Fallback
            </span>
          )}
          {dataSource === "supabase" ? (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 border border-blue-200">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              Supabase
            </span>
          ) : dataSource === "mock" ? (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600 border border-gray-200">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
              Mock Data
            </span>
          ) : null}
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 hover:bg-gray-50 transition-colors"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#C8102E] text-[10px] font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-gray-800 leading-none">{user.name}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 capitalize">{user.role}</p>
            </div>
            <svg className="h-3 w-3 text-gray-400" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 z-20 w-64 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                <div className="border-b border-gray-100 px-4 py-3 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C8102E]/10 text-sm font-bold text-[#C8102E]">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px]">
                    <Attr label="Role" value={user.role} />
                    <Attr label="Persona" value={user.persona} />
                    <Attr label="Type" value={(user as any).userType ?? "—"} />
                    <Attr label="Hon ID" value={(user as any).honId ?? "—"} mono />
                  </div>
                </div>
                <div className="p-2">
                  <Link
                    href="/dashboard"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3.5a3.5 3.5 0 110 7 3.5 3.5 0 010-7z" opacity=".3"/><path d="M8 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" /></svg>
                    Account Dashboard
                  </Link>
                  <button
                    onClick={() => { setUserMenuOpen(false); logout(); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M7 8h7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}

function Attr({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md bg-white border border-gray-100 px-2 py-1">
      <p className="text-[9px] text-gray-400 uppercase tracking-wide leading-none mb-0.5">{label}</p>
      <p className={`text-gray-700 truncate leading-none ${mono ? "font-mono text-[10px]" : "font-medium"}`}>
        {value}
      </p>
    </div>
  );
}

