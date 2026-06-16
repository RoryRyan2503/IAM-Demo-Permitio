/**
 * PermissionGate — conditional rendering based on permissions
 *
 * Wraps UI elements that should only be shown to users with
 * specific permissions. Falls back to a 403 message or null.
 *
 * IMPORTANT: This is UX gating, NOT security enforcement.
 * The server-side API routes enforce authorization independently.
 *
 * @example
 * <PermissionGate action="create" resource="quotes">
 *   <CreateQuoteButton />
 * </PermissionGate>
 *
 * @example with custom fallback
 * <PermissionGate action="view" resource="admin_dashboard" fallback={<AccessDenied />}>
 *   <AdminPanel />
 * </PermissionGate>
 */

"use client";

import React from "react";
import { usePermission } from "@/hooks/usePermission";
import { useAuth } from "@/context/AuthContext";

interface PermissionGateProps {
  action: string;
  resource: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
  /** If true, show a loading placeholder while permissions load */
  showLoading?: boolean;
}

export function PermissionGate({
  action,
  resource,
  fallback = null,
  children,
  showLoading = false,
}: PermissionGateProps) {
  const { isLoading } = useAuth();
  const hasPermission = usePermission(action, resource);

  if (isLoading && showLoading) {
    return (
      <div className="animate-pulse h-8 w-32 rounded bg-muted" aria-hidden="true" />
    );
  }

  if (isLoading) return null;

  return hasPermission ? <>{children}</> : <>{fallback}</>;
}

/**
 * RoleGate — render based on role (admin/buyer/viewer)
 *
 * Use sparingly — prefer permission-based checks over role checks.
 * Reserved for cases where the distinction is purely UX/labeling.
 */
interface RoleGateProps {
  roles: Array<"admin" | "buyer" | "viewer">;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function RoleGate({ roles, fallback = null, children }: RoleGateProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (!user || !roles.includes(user.role as "admin" | "buyer" | "viewer")) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
