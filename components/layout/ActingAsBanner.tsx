"use client";

/**
 * ActingAsBanner — shown once immediately after a Switch User action.
 * Reads a one-shot sessionStorage flag set by SwitchUserModal.
 */

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export function ActingAsBanner() {
  const { user, isLoading } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    try {
      if (sessionStorage.getItem("iam_just_switched") === "1") {
        setVisible(true);
        sessionStorage.removeItem("iam_just_switched");
      }
    } catch {
      // sessionStorage unavailable — skip banner
    }
  }, [isLoading]);

  if (!visible || !user) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-5 py-2 lg:px-7">
      <p className="text-xs font-medium text-amber-800">
        You are currently acting as <span className="font-semibold">{user.name}</span>{" "}
        <span className="capitalize">({user.role})</span>
      </p>
      <button
        onClick={() => setVisible(false)}
        className="text-amber-500 hover:text-amber-700"
        aria-label="Dismiss"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
