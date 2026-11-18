/**
 * AuthContext — Authentication state provider
 *
 * Wraps the entire app and provides:
 *   - session: current AuthSession | null
 *   - user: User profile from CRM
 *   - permissions: PermissionMap
 *   - isLoading: boolean
 *   - login(persona?): initiates login flow
 *   - logout(): calls /api/auth/logout
 *   - hasPermission(action, resource): quick boolean check
 *
 * IMPORTANT: hasPermission() is for UX rendering only.
 * All security decisions happen on the server via canAccess().
 */

"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import type { AuthSession, PermissionMap, UserRole, UserPersona } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserProfile {
  id: string;
  honId: string;
  contactId: string;
  name: string;
  email: string;
  role: UserRole;
  persona: UserPersona;
}

export type AuthEngine = "pingauthorize" | "pingauthorize-demo" | "mixed" | "unknown";
export type DataSource = "supabase" | "mock" | "dynamodb" | "unknown";

interface AuthContextValue {
  session: AuthSession | null;
  user: UserProfile | null;
  permissions: PermissionMap;
  authEngine: AuthEngine;
  dataSource: DataSource;
  isLoading: boolean;
  permissionError: string | null;
  isAuthenticated: boolean;
  login: (persona?: "admin" | "buyer" | "viewer") => void;
  logout: () => Promise<void>;
  hasPermission: (action: string, resource: string) => boolean;
  refreshPermissions: (accountId?: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface AuthProviderProps {
  children: React.ReactNode;
  initialSession?: AuthSession | null;
}

export function AuthProvider({
  children,
  initialSession = null,
}: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(initialSession);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [permissions, setPermissions] = useState<PermissionMap>({});
  const [authEngine, setAuthEngine] = useState<AuthEngine>("unknown");
  const [dataSource, setDataSource] = useState<DataSource>("unknown");
  const [isLoading, setIsLoading] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const selectedAccountId = useRef<string | undefined>();
  const pendingRequest = useRef<{
    accountId?: string;
    controller: AbortController;
    promise: Promise<void>;
  } | null>(null);

  // ------------------------------------------------------------------
  // Fetch permissions + user from /api/auth/permissions
  // ------------------------------------------------------------------
  const fetchPermissions = useCallback(
    (accountId?: string): Promise<void> => {
      const requestedAccountId = accountId ?? selectedAccountId.current;
      const pending = pendingRequest.current;
      if (pending && !pending.controller.signal.aborted && pending.accountId === requestedAccountId) {
        return pending.promise;
      }

      pending?.controller.abort();
      if (requestedAccountId !== selectedAccountId.current) {
        setPermissions({});
        setIsLoading(true);
      }
      selectedAccountId.current = requestedAccountId;
      const controller = new AbortController();

      const promise = (async () => {
        try {
          const headers: Record<string, string> = {};
          if (requestedAccountId) headers["x-account-id"] = requestedAccountId;
          const res = await fetch("/api/auth/permissions", {
            headers,
            signal: controller.signal,
            cache: "no-store",
          });
          if (controller.signal.aborted) return;

          if (res.status === 401) {
            setSession(null);
            setUser(null);
            setPermissions({});
            setPermissionError(null);
            selectedAccountId.current = undefined;
            return;
          }

          const data = await res.json();
          if (controller.signal.aborted) return;
          if (!res.ok) throw new Error(data.error ?? "Unable to refresh permissions.");
          if (!data.user?.id || !data.permissions || typeof data.permissions !== "object"
              || Array.isArray(data.permissions) || Object.keys(data.permissions).length === 0
              || Object.values(data.permissions).some((value) => typeof value !== "boolean")) {
            throw new Error("The permissions service returned an invalid response.");
          }

          selectedAccountId.current = data.selectedAccount?.accountId ?? requestedAccountId;
          setUser(data.user);
          setPermissions(data.permissions ?? {});
          setAuthEngine(data.authEngine ?? "unknown");
          setDataSource(data.dataSource ?? "unknown");
          setPermissionError(null);
        } catch (error) {
          if (controller.signal.aborted) return;
          const message = error instanceof Error ? error.message : "Unable to refresh permissions.";
          console.error("[AuthContext] Permission refresh failed:", message);
          setPermissionError(message);
        } finally {
          if (pendingRequest.current?.controller === controller) {
            pendingRequest.current = null;
            setIsLoading(false);
          }
        }
      })();
      pendingRequest.current = { accountId: requestedAccountId, controller, promise };
      return promise;
    },
    []
  );

  // ------------------------------------------------------------------
  // Initialize on mount
  // ------------------------------------------------------------------
  useEffect(() => {
    void fetchPermissions();
    return () => pendingRequest.current?.controller.abort();
  }, [fetchPermissions]);

  // ------------------------------------------------------------------
  // Re-fetch permissions whenever the tab regains focus/visibility.
  //
  // Permissions are otherwise only fetched once at initial load, so
  // changes made directly in the Permit.io / PingAuthorize dashboard
  // (in another tab) would never show up in this app without a manual
  // hard refresh. Refetching on focus keeps the UI in sync without
  // needing to poll continuously.
  // ------------------------------------------------------------------
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") {
        void fetchPermissions();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [fetchPermissions]);

  // ------------------------------------------------------------------
  // Auth actions
  // ------------------------------------------------------------------
  const login = useCallback((persona?: "admin" | "buyer" | "viewer") => {
    const url = persona
      ? `/api/auth/login?persona=${persona}`
      : "/api/auth/login";
    window.location.href = url;
  }, []);

  const logout = useCallback(async () => {
    pendingRequest.current?.controller.abort();
    selectedAccountId.current = undefined;
    setSession(null);
    setUser(null);
    setPermissions({});
    setPermissionError(null);
    window.location.href = "/api/auth/logout";
  }, []);

  const refreshPermissions = useCallback(
    async (accountId?: string) => {
      await fetchPermissions(accountId);
    },
    [fetchPermissions]
  );

  // ------------------------------------------------------------------
  // Permission check helper (UX only — NOT a security boundary)
  // ------------------------------------------------------------------
  const hasPermission = useCallback(
    (action: string, resource: string): boolean => {
      const key = `${action}:${resource}` as keyof PermissionMap;
      return permissions[key] ?? false;
    },
    [permissions]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      permissions,
      authEngine,
      dataSource,
      isLoading,
      permissionError,
      isAuthenticated: !!user,
      login,
      logout,
      hasPermission,
      refreshPermissions,
    }),
    [session, user, permissions, authEngine, dataSource, isLoading, permissionError, login, logout, hasPermission, refreshPermissions]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
