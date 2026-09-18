"use client";

/**
 * ProviderPanel — Admin Console "Overview" tab
 *
 * Shows PingAuthorize connectivity status, policy set/policy counts, a
 * configuration-health warning banner (when PingAuthorize is enabled but not
 * fully configured), and a feed of recent authorization decisions from the
 * audit log.
 */

import { useCallback, useEffect, useState } from "react";

interface ConnectivityStatus {
  connected: boolean;
  message?: string;
}

interface ProviderStatus {
  active: "ping";
  connectivity: { ping: ConnectivityStatus };
  pingConfigWarning?: string;
  counts: { policySets: number | null; policies: number | null };
  countsError?: string;
}

interface AuditEntry {
  id: string;
  timestamp: number;
  provider: string;
  engine: string;
  userId: string;
  action: string;
  resource: string;
  decision: boolean;
  latencyMs: number;
  reason?: string;
}

const PROVIDER_LABEL: Record<string, string> = {
  ping: "PingAuthorize",
};

export function ProviderPanel() {
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, auditRes] = await Promise.all([
        fetch("/api/admin/auth-provider"),
        fetch("/api/admin/audit-log?limit=15"),
      ]);
      if (statusRes.ok) setStatus(await statusRes.json());
      if (auditRes.ok) {
        const data = await auditRes.json();
        setAudit(data.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !status) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#C8102E] border-t-transparent" />
        <span className="ml-3 text-sm text-gray-500">Loading provider status...</span>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        Could not load provider status. Check that the dev server is running and you&apos;re signed in as an admin.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {status.pingConfigWarning && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <p className="font-semibold">PingAuthorize configuration incomplete</p>
          <p className="mt-1 leading-snug">{status.pingConfigWarning}</p>
        </div>
      )}

      {/* Active provider */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Active Authorization Provider</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{PROVIDER_LABEL[status.active]}</p>
          </div>
        </div>
      </div>

      {/* Connectivity + counts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(["ping"] as const).map((p) => {
          const conn = status.connectivity[p];
          return (
            <div key={p} className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold text-gray-500">{PROVIDER_LABEL[p]}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className={`h-2 w-2 rounded-full ${conn.connected ? "bg-green-500" : "bg-amber-500"}`} />
                <span className={`text-xs font-medium ${conn.connected ? "text-green-700" : "text-amber-700"}`}>
                  {conn.connected ? "Connected" : "Demo / fallback mode"}
                </span>
              </div>
              {conn.message && <p className="text-[10px] text-gray-400 mt-1.5 leading-snug">{conn.message}</p>}
            </div>
          );
        })}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold text-gray-500">Policy Sets</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{status.counts.policySets ?? "—"}</p>
          {status.counts.policySets === null && status.countsError && (
            <p className="text-[10px] text-red-500 mt-1 leading-snug truncate" title={status.countsError}>
              {status.countsError}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold text-gray-500">Policies</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{status.counts.policies ?? "—"}</p>
          {status.counts.policies === null && status.countsError && (
            <p className="text-[10px] text-red-500 mt-1 leading-snug truncate" title={status.countsError}>
              {status.countsError}
            </p>
          )}
        </div>
      </div>

      {/* Recent decisions */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-800">Recent Authorization Decisions</p>
          <p className="text-xs text-gray-500 mt-0.5">Live audit trail from AuthorizationService</p>
        </div>
        {audit.length === 0 ? (
          <p className="text-xs text-gray-400 px-5 py-6 text-center">No decisions recorded yet.</p>
        ) : (
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {audit.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 px-5 py-2.5 text-xs">
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold ${
                    entry.decision ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  }`}
                >
                  {entry.decision ? "ALLOW" : "DENY"}
                </span>
                <span className="font-mono text-gray-500">{entry.engine}</span>
                <span className="text-gray-700">
                  {entry.action}:{entry.resource}
                </span>
                <span className="text-gray-400">user={entry.userId}</span>
                <span className="ml-auto text-gray-300">{entry.latencyMs}ms</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

