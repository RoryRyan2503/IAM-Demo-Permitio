/**
 * AccessDenied — 403 UI component
 *
 * Displayed when a user tries to access a resource they don't have
 * permission for. Used as fallback in PermissionGate and on /403 page.
 */

"use client";

import React from "react";
import Link from "next/link";

interface AccessDeniedProps {
  title?: string;
  message?: string;
  showHomeLink?: boolean;
  compact?: boolean;
}

export function AccessDenied({
  title = "Access Denied",
  message = "You don't have permission to view this content.",
  showHomeLink = false,
  compact = false,
}: AccessDeniedProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <LockIcon className="h-4 w-4 shrink-0" />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card p-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <LockIcon className="h-8 w-8 text-destructive" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
      {showHomeLink && (
        <Link
          href="/dashboard"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Go to Dashboard
        </Link>
      )}
    </div>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}
