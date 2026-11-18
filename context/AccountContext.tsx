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
  selectedCurrency: string;
  availableAccounts: Account[];
  selectedSalesOrgs: string[];
  isLoading: boolean;
  error: string | null;
  switchAccount: (accountId: string) => Promise<void>;
  setSelectedCurrency: (currency: string) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AccountContext = createContext<AccountContextValue | null>(null);

const STORAGE_KEY = "iam_selected_account";
const CURRENCY_STORAGE_KEY = "iam_selected_currency";
const DEFAULT_CURRENCY = process.env.NEXT_PUBLIC_COVEO_DEFAULT_CURRENCY ?? "USD";

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, refreshPermissions } = useAuth();
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [selectedCurrency, setSelectedCurrencyState] = useState(DEFAULT_CURRENCY);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedCurrency = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (savedCurrency && /^[A-Z]{3}$/.test(savedCurrency)) {
      setSelectedCurrencyState(savedCurrency);
    }
  }, []);

  const setSelectedCurrency = useCallback((currency: string) => {
    const normalized = currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalized)) {
      throw new Error("Currency must be a three-letter ISO code.");
    }
    setSelectedCurrencyState(normalized);
    localStorage.setItem(CURRENCY_STORAGE_KEY, normalized);
  }, []);

  // ------------------------------------------------------------------
  // Fetch user context from CRM API
  // ------------------------------------------------------------------
  const fetchUserContext = useCallback(
    async (accountId?: string) => {
      if (!user?.id) return;

      setIsLoading(true);
      setError(null);
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
          if (!retryRes.ok) {
            const retryData = await retryRes.json();
            setError(retryData.error ?? "Unable to load your Sold-To accounts.");
            return;
          }
          const data: UserContext = await retryRes.json();
          setUserContext(data);
          if (data.selectedAccount) {
            localStorage.setItem(STORAGE_KEY, data.selectedAccount.accountId);
          }
          await refreshPermissions();
          return;
        }

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Unable to load your Sold-To accounts.");
          return;
        }

        const data: UserContext = await res.json();
        setUserContext(data);

        // Persist selected account
        if (data.selectedAccount) {
          localStorage.setItem(STORAGE_KEY, data.selectedAccount.accountId);
        }

        // Refresh permissions for the new account context
        await refreshPermissions();
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Unable to load your Sold-To accounts.");
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
      setError(null);
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
      selectedCurrency,
      availableAccounts,
      selectedSalesOrgs,
      isLoading,
      error,
      switchAccount,
      setSelectedCurrency,
    }),
    [userContext, selectedAccount, selectedCurrency, availableAccounts, selectedSalesOrgs, isLoading, error, switchAccount, setSelectedCurrency]
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
