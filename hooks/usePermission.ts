/**
 * usePermission — client-side permission check hook
 *
 * Returns a boolean indicating whether the current user has
 * the given permission. Reads from the AuthContext permissions map.
 *
 * USE FOR: conditional rendering (show/hide UI elements)
 * DO NOT USE FOR: security enforcement (that happens on the server)
 *
 * @example
 * const canCreateQuote = usePermission('create', 'quotes')
 * return canCreateQuote ? <CreateQuoteButton /> : null
 */

"use client";

import { useAuth } from "@/context/AuthContext";

export function usePermission(action: string, resource: string): boolean {
  const { hasPermission, isLoading } = useAuth();

  // While permissions are loading, return false (safe default)
  if (isLoading) return false;

  return hasPermission(action, resource);
}

/**
 * usePermissions — check multiple permissions at once
 *
 * @example
 * const { canView, canCreate } = usePermissions({
 *   canView: ['view', 'products'],
 *   canCreate: ['create', 'orders'],
 * })
 */
export function usePermissions<T extends Record<string, [string, string]>>(
  checks: T
): Record<keyof T, boolean> {
  const { hasPermission, isLoading } = useAuth();

  if (isLoading) {
    return Object.fromEntries(
      Object.keys(checks).map((k) => [k, false])
    ) as Record<keyof T, boolean>;
  }

  return Object.fromEntries(
    Object.entries(checks).map(([key, [action, resource]]) => [
      key,
      hasPermission(action, resource),
    ])
  ) as Record<keyof T, boolean>;
}
