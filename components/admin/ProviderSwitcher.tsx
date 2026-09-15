"use client";

/**
 * ProviderSwitcher — compact header dropdown for switching the active
 * authorization provider (Permit.io / PingAuthorize) at runtime, from
 * anywhere in the Admin Console (not just the Provider tab).
 */

import { useCallback, useEffect, useState } from "react";

interface ProviderStatusLite {
  active: "permit" | "ping";
  envDefault: "permit" | "ping";
  runtimeOverride: "permit" | "ping" | null;
  available: string[];
}

const PROVIDER_LABEL: Record<string, string> = {
  permit: "Permit.io",
  ping: "PingAuthorize",
};

export function ProviderSwitcher({ onChanged }: { onChanged?: () => void }) {
  const [status, setStatus] = useState<ProviderStatusLite | null>(null);
  const [switching, setSwitching] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/auth-provider");
      if (res.ok) {
        const data = await res.json();
        setStatus({
          active: data.active,
          envDefault: data.envDefault,
          runtimeOverride: data.runtimeOverride,
          available: data.available ?? ["permit", "ping"],
        });
      }
    } catch {
      // silently ignore — header switcher degrades gracefully if the status call fails
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const switchProvider = async (value: string) => {
    if (!status) return;
    const provider = value === "__env_default__" ? null : (value as "permit" | "ping");
    setSwitching(true);
    try {
      await fetch("/api/admin/auth-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      await load();
      onChanged?.();
    } finally {
      setSwitching(false);
    }
  };

  if (!status) {
    return <div className="h-8 w-40 rounded-lg bg-gray-100 animate-pulse" />;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-green-500" title="Active provider" />
      <select
        value={status.runtimeOverride ?? "__env_default__"}
        disabled={switching}
        onChange={(e) => switchProvider(e.target.value)}
        className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-50"
        title="Switch active authorization provider"
      >
        <option value="__env_default__">
          Env default ({PROVIDER_LABEL[status.envDefault]})
        </option>
        {status.available.map((p) => (
          <option key={p} value={p}>
            Use {PROVIDER_LABEL[p] ?? p}
          </option>
        ))}
      </select>
      <span className="text-[11px] font-medium text-gray-400">
        active: <span className="text-gray-600">{PROVIDER_LABEL[status.active] ?? status.active}</span>
      </span>
    </div>
  );
}
