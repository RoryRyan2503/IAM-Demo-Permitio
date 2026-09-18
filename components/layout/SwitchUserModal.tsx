"use client";

/**
 * SwitchUserModal — demo-only persona switcher
 *
 * Lets any signed-in demo user instantly assume a different persona without
 * a real login flow. Uses the existing demo-mode session creation in
 * /api/auth/login?persona=. Sets a sessionStorage flag so the next page can
 * show the "acting as" banner.
 */

import { useState } from "react";

interface DemoUser {
  persona: "admin" | "buyer" | "viewer";
  name: string;
  role: string;
  company: string;
}

const DEMO_USERS: DemoUser[] = [
  { persona: "admin", name: "Miguel Patel", role: "Admin", company: "Honeywell Corporate" },
  { persona: "buyer", name: "Carlos Rodriguez", role: "Buyer", company: "Acme Industries" },
  { persona: "viewer", name: "Sarah Johnson", role: "Viewer", company: "Global Manufacturing" },
];

export function SwitchUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [switching, setSwitching] = useState<string | null>(null);

  if (!open) return null;

  const handleSelect = (persona: string) => {
    setSwitching(persona);
    try {
      sessionStorage.setItem("iam_just_switched", "1");
    } catch {
      // sessionStorage unavailable — banner just won't show, non-critical
    }
    window.location.href = `/api/auth/login?persona=${persona}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Switch User</p>
            <p className="text-xs text-gray-500 mt-0.5">Demo environment — instant persona switch, no re-login</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <div className="p-3 space-y-1.5">
          {DEMO_USERS.map((u) => (
            <button
              key={u.persona}
              onClick={() => handleSelect(u.persona)}
              disabled={switching !== null}
              className="w-full flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-3 text-left hover:border-[#C8102E]/40 hover:bg-[#C8102E]/5 transition-colors disabled:opacity-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C8102E]/10 text-sm font-bold text-[#C8102E]">
                {u.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{u.name}</p>
                <p className="text-[11px] text-gray-500">{u.company}</p>
              </div>
              <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                {u.role}
              </span>
              {switching === u.persona && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#C8102E] border-t-transparent" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
        clipRule="evenodd"
      />
    </svg>
  );
}
