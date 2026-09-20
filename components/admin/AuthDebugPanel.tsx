"use client";

/**
 * AuthDebugPanel — Admin Console "Debug" tab
 *
 * Developer/demo panel (admin-only) showing recent authorization decisions:
 * current user, provider, request, response, decision and reason. Reuses the
 * existing audit log recorded by AuthorizationService.
 */

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

interface AuditEntry {
  id: string;
  timestamp: number;
  provider: string;
  engine: string;
  userId: string;
  userRole?: string;
  action: string;
  resource: string;
  decision: boolean;
  latencyMs: number;
  reason?: string;
  error?: string;
  request?: unknown;
  response?: unknown;
}

function toPrettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value ?? "") || "{}";
  }
}

export function AuthDebugPanel() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/audit-log?limit=25");
      if (res.ok) {
        const data = await res.json();
        setEntries(data.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const clearLog = useCallback(async () => {
    await fetch("/api/admin/audit-log", { method: "DELETE" });
    setEntries([]);
    setSelectedEntry(null);
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Current User</p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5">
            {user?.name} <span className="text-gray-400 capitalize font-normal">({user?.role})</span>
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Authorization Provider</p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5">PingAuthorize</p>
        </div>
        <button
          onClick={load}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-gray-600 hover:border-gray-300"
        >
          Refresh
        </button>
        <button
          onClick={clearLog}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-gray-600 hover:border-red-300 hover:text-red-600"
        >
          Clear Log
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">Policy Request / Response Log</p>
            <p className="text-xs text-gray-500 mt-0.5">Click any row to inspect the exact payload and response.</p>
          </div>

          {loading && entries.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#C8102E] border-t-transparent" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-xs text-gray-400 px-5 py-8 text-center">No decisions recorded yet.</p>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[520px] overflow-y-auto">
              {entries.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setSelectedEntry(e)}
                  className={`w-full px-5 py-3.5 flex items-start gap-3 text-left transition-colors hover:bg-gray-50 ${
                    selectedEntry?.id === e.id ? "bg-gray-50" : ""
                  }`}
                >
                  <span
                    className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      e.decision
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {e.decision ? "PERMIT" : "DENY"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-800">
                      <span className="font-semibold">{e.userId}</span> requested{" "}
                      <span className="font-mono text-[11px]">{e.action}</span> on{" "}
                      <span className="font-mono text-[11px]">{e.resource}</span>
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Policy Source: {e.provider} ({e.engine}) · {e.latencyMs}ms
                      {e.reason ? ` · ${e.reason}` : ""}
                      {e.error ? ` · error: ${e.error}` : ""}
                    </p>
                  </div>
                  <p className="text-[10px] text-gray-300 shrink-0">
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden min-h-[360px]">
          {selectedEntry ? (
            <div className="divide-y divide-gray-100">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">Selected Authorization Detail</p>
                <p className="text-[10px] text-gray-500 mt-1">
                  {selectedEntry.userId} · {selectedEntry.action} · {selectedEntry.resource}
                </p>
              </div>

              <div className="p-5 space-y-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Reason</p>
                  <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-[11px] text-gray-700 break-all">
                    {selectedEntry.reason ?? `PingAuthorize decision: ${selectedEntry.decision ? "PERMIT" : "DENY"}`}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Request Payload</p>
                  <pre className="max-h-[220px] overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-[11px] text-gray-700 whitespace-pre-wrap break-all">
                    {toPrettyJson(selectedEntry.request ?? { message: "No request payload captured" })}
                  </pre>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Response</p>
                  <pre className="max-h-[260px] overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-[11px] text-gray-700 whitespace-pre-wrap break-all">
                    {toPrettyJson(selectedEntry.response ?? { message: "No response captured" })}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[360px] items-center justify-center p-6 text-center text-xs text-gray-400">
              Select a decision to inspect the request payload and response.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
