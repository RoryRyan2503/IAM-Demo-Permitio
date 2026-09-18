"use client";

/**
 * useRouteGuard — client-side route authorization guard
 *
 * Redirects to /access-denied?resource=<resource> when the current user
 * lacks the given permission. UX-level guard only — every API route still
 * enforces authorization independently via AuthorizationService.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePermission } from "@/hooks/usePermission";
import { useAuth } from "@/context/AuthContext";

export function useRouteGuard(action: string, resource: string): boolean {
  const router = useRouter();
  const { isLoading } = useAuth();
  const allowed = usePermission(action, resource);

  useEffect(() => {
    if (isLoading) return;
    if (!allowed) {
      router.replace(`/access-denied?resource=${encodeURIComponent(resource)}`);
    }
  }, [isLoading, allowed, resource, router]);

  return allowed;
}
