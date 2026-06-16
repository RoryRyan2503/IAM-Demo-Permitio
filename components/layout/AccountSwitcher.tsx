"use client";

import { useAccountContext } from "@/context/AccountContext";

/**
 * Compact sold-to switcher — used in modal or secondary contexts.
 * The primary switcher is embedded directly in Navbar.
 */
export function AccountSwitcher() {
  const { selectedAccount, availableAccounts, switchAccount, isLoading, userContext } =
    useAccountContext();
  const activeSalesArea = userContext?.activeSalesArea;

  if (!availableAccounts || availableAccounts.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Sold-to Account
        </p>
        {isLoading && (
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#C8102E] border-t-transparent" />
        )}
      </div>

      <select
        value={selectedAccount?.accountId ?? ""}
        onChange={(e) => switchAccount(e.target.value)}
        disabled={isLoading}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-[#C8102E] focus:outline-none focus:ring-1 focus:ring-[#C8102E] disabled:opacity-50"
      >
        {availableAccounts.map((account) => (
          <option key={account.accountId} value={account.accountId}>
            {account.accountName}
          </option>
        ))}
      </select>

      {selectedAccount && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Account #</span>
            <span className="font-mono text-foreground">{selectedAccount.accountNumber ?? selectedAccount.accountId}</span>
          </div>
          {activeSalesArea && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Active Sales Area</span>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className="font-mono text-foreground">{activeSalesArea}</span>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {selectedAccount.salesOrgList?.map((sa) => (
              <span
                key={sa.salesArea}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-mono ${
                  activeSalesArea === sa.salesArea
                    ? "border-[#C8102E]/40 bg-[#C8102E]/8 text-[#C8102E]"
                    : "border-border bg-muted text-muted-foreground"
                }`}
              >
                {sa.salesArea} · {sa.currency}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

