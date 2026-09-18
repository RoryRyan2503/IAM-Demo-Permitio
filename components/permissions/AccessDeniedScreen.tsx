"use client";

/**
 * AccessDeniedScreen — polished enterprise "Access Restricted" experience
 * Shared by /403 and /access-denied routes.
 */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function AccessDeniedScreen() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const resource = searchParams.get("resource");

  const resourceLabel = resource
    ? resource.replace(/^\//, "").replace(/[-/]/g, " ").trim() || "Requested Page"
    : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#0B0B0C] p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151517] p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#C8102E]/10">
          <svg className="h-8 w-8 text-[#C8102E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>

        <h1 className="mt-5 text-xl font-bold text-white">Access Restricted</h1>
        <p className="mt-2 text-sm text-white/50">
          You do not currently have permission to access this resource.
        </p>

        <div className="mt-6 space-y-2 text-left">
          {resourceLabel && (
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
                Requested Resource
              </p>
              <p className="text-sm font-medium text-white mt-0.5 capitalize">{resourceLabel}</p>
            </div>
          )}
          {user && (
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Current User</p>
              <p className="text-sm font-medium text-white mt-0.5">
                {user.name} <span className="text-white/40 capitalize">({user.role})</span>
              </p>
            </div>
          )}
        </div>

        <Link
          href="/products"
          className="mt-7 inline-flex items-center justify-center w-full rounded-lg bg-[#C8102E] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#a80d26] transition-colors"
        >
          Back to Products
        </Link>
      </div>
    </div>
  );
}
