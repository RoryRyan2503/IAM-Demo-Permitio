/**
 * AccountContext — Multi-account / sold-to account switcher
 *
 * Manages the user's currently selected "sold-to" account.
 * When the account changes:
 *   1. Updates the selectedAccount in context
 *   2. Triggers permission refresh (salesOrgs change per account)
 *   3. Persists selection to localStorage for page reload
 *
 * This mirrors enterprise B2B patterns where buyers operate
 * on behalf of multiple company accounts (e.g., Honeywell US vs EU).
 */

"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useAuth } from "@/context/AuthContext";
import type { UserContext, Account } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AccountContextValue {
  userContext: UserContext | null;
  selectedAccount: Account | null;
  availableAccounts: Account[];
  selectedSalesOrgs: string[];
  isLoading: boolean;
  switchAccount: (accountId: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AccountContext = createContext<AccountContextValue | null>(null);

const STORAGE_KEY = "iam_selected_account";

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, refreshPermissions } = useAuth();
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ------------------------------------------------------------------
  // Fetch user context from CRM API
  // ------------------------------------------------------------------
  const fetchUserContext = useCallback(
    async (accountId?: string) => {
      if (!user?.id) return;

      setIsLoading(true);
      try {
        const url = accountId
          ? `/api/crm/user-context/me?accountId=${accountId}`
          : "/api/crm/user-context/me";

        const res = await fetch(url);

        // If the saved account doesn't belong to this user (403),
        // retry without the account filter to get their default account
        if (res.status === 403 && accountId) {
          localStorage.removeItem(STORAGE_KEY);
          const retryRes = await fetch("/api/crm/user-context/me");
          if (!retryRes.ok) return;
          const data: UserContext = await retryRes.json();
          setUserContext(data);
          if (data.selectedAccount) {
            localStorage.setItem(STORAGE_KEY, data.selectedAccount.accountId);
          }
          await refreshPermissions();
          return;
        }

        if (!res.ok) return;

        const data: UserContext = await res.json();
        setUserContext(data);

        // Persist selected account
        if (data.selectedAccount) {
          localStorage.setItem(STORAGE_KEY, data.selectedAccount.accountId);
        }

        // Refresh permissions for the new account context
        await refreshPermissions();
      } catch {
        // Silent fail — demo mode works without API
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id, refreshPermissions]
  );

  // ------------------------------------------------------------------
  // Initialize on auth state change
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setUserContext(null);
      return;
    }

    // Restore previously selected account from localStorage
    const savedAccountId = localStorage.getItem(STORAGE_KEY) ?? undefined;
    fetchUserContext(savedAccountId);
  }, [isAuthenticated, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------------
  // Account switcher
  // ------------------------------------------------------------------
  const switchAccount = useCallback(
    async (accountId: string) => {
      await fetchUserContext(accountId);
    },
    [fetchUserContext]
  );

  // ------------------------------------------------------------------
  // Derived state
  // ------------------------------------------------------------------
  const selectedAccount = useMemo<Account | null>(() => {
    return userContext?.selectedAccount ?? null;
  }, [userContext]);

  const availableAccounts = useMemo<Account[]>(() => {
    return userContext?.user?.accounts ?? [];
  }, [userContext]);

  const selectedSalesOrgs = useMemo<string[]>(() => {
    return userContext?.selectedSalesOrgs ?? [];
  }, [userContext]);

  const value = useMemo<AccountContextValue>(
    () => ({
      userContext,
      selectedAccount,
      availableAccounts,
      selectedSalesOrgs,
      isLoading,
      switchAccount,
    }),
    [userContext, selectedAccount, availableAccounts, selectedSalesOrgs, isLoading, switchAccount]
  );

  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAccountContext(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) {
    throw new Error("useAccountContext must be used within an AccountProvider");
  }
  return ctx;
}
