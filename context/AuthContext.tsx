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
} from "react";
import type { AuthSession, PermissionMap, UserRole, UserPersona } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  persona: UserPersona;
}

export type AuthEngine = "permit.io" | "fallback" | "unknown";
export type DataSource = "supabase" | "mock" | "unknown";

interface AuthContextValue {
  session: AuthSession | null;
  user: UserProfile | null;
  permissions: PermissionMap;
  authEngine: AuthEngine;
  dataSource: DataSource;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (persona?: "admin" | "buyer" | "viewer") => void;
  logout: () => Promise<void>;
  hasPermission: (action: string, resource: string) => boolean;
  refreshPermissions: () => Promise<void>;
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

  // ------------------------------------------------------------------
  // Fetch permissions + user from /api/auth/permissions
  // ------------------------------------------------------------------
  const fetchPermissions = useCallback(
    async (accountId?: string) => {
      try {
        const headers: Record<string, string> = {};
        if (accountId) {
          headers["x-account-id"] = accountId;
        }

        const res = await fetch("/api/auth/permissions", { headers });

        if (res.status === 401) {
          setSession(null);
          setUser(null);
          setPermissions({});
          return;
        }

        if (!res.ok) return;

        const data = await res.json();
        setUser(data.user);
        setPermissions(data.permissions ?? {});
        setAuthEngine(data.authEngine ?? "unknown");
        setDataSource(data.dataSource ?? "unknown");
      } catch {
        // Network error or server down — silent fail
      }
    },
    []
  );

  // ------------------------------------------------------------------
  // Initialize on mount
  // ------------------------------------------------------------------
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      if (initialSession) {
        setSession(initialSession);
        await fetchPermissions();
      } else {
        // No initial session — check if one exists via API
        await fetchPermissions();
      }
      setIsLoading(false);
    };

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        fetchPermissions();
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
    setSession(null);
    setUser(null);
    setPermissions({});
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
      isAuthenticated: !!user,
      login,
      logout,
      hasPermission,
      refreshPermissions,
    }),
    [session, user, permissions, authEngine, dataSource, isLoading, login, logout, hasPermission, refreshPermissions]
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
