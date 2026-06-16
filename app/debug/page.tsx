"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface UpstreamCall {
  service: string;
  method: string;
  url: string;
  status?: number;
  durationMs?: number;
  error?: string;
}

interface TraceEntry {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  pathname: string;
  requestHeaders: Record<string, string>;
  query: Record<string, string>;
  requestBody?: string;
  userId?: string;
  userRole?: string;
  status?: number;
  responseTime?: number;
  responseSummary?: string;
  upstreamCalls: UpstreamCall[];
  tags: string[];
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-800",
  POST: "bg-blue-100 text-blue-800",
  PUT: "bg-amber-100 text-amber-800",
  PATCH: "bg-orange-100 text-orange-800",
  DELETE: "bg-red-100 text-red-800",
};

const STATUS_COLORS: Record<string, string> = {
  "2": "text-emerald-600",
  "3": "text-blue-600",
  "4": "text-amber-600",
  "5": "text-red-600",
};

function statusColor(status?: number): string {
  if (!status) return "text-gray-400";
  return STATUS_COLORS[String(status)[0]] ?? "text-gray-600";
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  } as any);
}

export default function DebugPage() {
  const [traces, setTraces] = useState<TraceEntry[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<TraceEntry | null>(null);
  const [isStreaming, setIsStreaming] = useState(true);
  const [filter, setFilter] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load existing traces
  useEffect(() => {
    fetch("/api/debug/traces")
      .then((r) => r.json())
      .then((d) => setTraces(d.traces ?? []))
      .catch(() => {});
  }, []);

  // SSE stream for live updates
  useEffect(() => {
    if (!isStreaming) {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      return;
    }

    const es = new EventSource("/api/debug/traces/stream");
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const entry: TraceEntry = JSON.parse(event.data);
        setTraces((prev) => [entry, ...prev].slice(0, 200));
      } catch {
        // ignore
      }
    };

    es.onerror = () => {
      // Reconnect after 2s
      es.close();
      setTimeout(() => {
        if (isStreaming) {
          setIsStreaming(false);
          setTimeout(() => setIsStreaming(true), 100);
        }
      }, 2000);
    };

    return () => es.close();
  }, [isStreaming]);

  const clearAll = useCallback(() => {
    fetch("/api/debug/traces", { method: "DELETE" }).then(() => {
      setTraces([]);
      setSelectedTrace(null);
    });
  }, []);

  const filtered = filter
    ? traces.filter(
        (t) =>
          t.pathname.toLowerCase().includes(filter.toLowerCase()) ||
          t.method.toLowerCase().includes(filter.toLowerCase()) ||
          t.tags.some((tag) => tag.toLowerCase().includes(filter.toLowerCase()))
      )
    : traces;

  return (
    <div className="h-screen flex flex-col bg-[#0d1117] text-gray-200 font-mono text-xs">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#161b22] border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isStreaming ? "bg-emerald-400 animate-pulse" : "bg-gray-600"}`} />
          <span className="text-[11px] font-semibold text-gray-300">API Debug Console</span>
        </div>
        <input
          type="text"
          placeholder="Filter by path, method, or tag…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 max-w-xs bg-[#0d1117] border border-gray-700 rounded px-2 py-1 text-[11px] text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-blue-500"
        />
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[10px] text-gray-500">{filtered.length} traces</span>
          <button
            onClick={() => setIsStreaming((v) => !v)}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              isStreaming
                ? "bg-emerald-900/50 text-emerald-400 border border-emerald-700"
                : "bg-gray-800 text-gray-500 border border-gray-700"
            }`}
          >
            {isStreaming ? "● Live" : "○ Paused"}
          </button>
          <button
            onClick={clearAll}
            className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-800 text-gray-500 border border-gray-700 hover:text-red-400 hover:border-red-700 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* ── Main Split ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Trace List ── */}
        <div ref={listRef} className="w-1/2 overflow-y-auto border-r border-gray-800">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-600">
              <div className="text-center">
                <p className="text-sm">No API traces yet</p>
                <p className="text-[10px] mt-1 text-gray-700">
                  Browse the app in another tab to see requests flow in
                </p>
              </div>
            </div>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTrace(t)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 border-b border-gray-800/60 text-left transition-colors hover:bg-[#161b22] ${
                  selectedTrace?.id === t.id ? "bg-[#1c2128] border-l-2 border-l-blue-500" : ""
                }`}
              >
                <span className="text-[10px] text-gray-600 w-[70px] shrink-0">
                  {formatTime(t.timestamp)}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold w-[42px] text-center shrink-0 ${
                    METHOD_COLORS[t.method] ?? "bg-gray-200 text-gray-700"
                  }`}
                >
                  {t.method}
                </span>
                <span className="flex-1 text-[11px] text-gray-300 truncate">{t.pathname}</span>
                <span className={`text-[11px] font-bold shrink-0 ${statusColor(t.status)}`}>
                  {t.status ?? "…"}
                </span>
                <span className="text-[10px] text-gray-600 w-[50px] text-right shrink-0">
                  {t.responseTime ? `${t.responseTime}ms` : ""}
                </span>
              </button>
            ))
          )}
        </div>

        {/* ── Detail Panel ── */}
        <div className="w-1/2 overflow-y-auto bg-[#0d1117]">
          {selectedTrace ? (
            <TraceDetail trace={selectedTrace} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-600">
              <p className="text-sm">Select a trace to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TraceDetail({ trace }: { trace: TraceEntry }) {
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              METHOD_COLORS[trace.method] ?? "bg-gray-200 text-gray-700"
            }`}
          >
            {trace.method}
          </span>
          <span className={`text-sm font-bold ${statusColor(trace.status)}`}>
            {trace.status ?? "pending"}
          </span>
          {trace.responseTime && (
            <span className="text-[11px] text-gray-500">{trace.responseTime}ms</span>
          )}
        </div>
        <p className="text-[11px] text-gray-300 break-all">{trace.url}</p>
        <p className="text-[10px] text-gray-600">{new Date(trace.timestamp).toISOString()}</p>
      </div>

      {/* Tags */}
      {trace.tags.length > 0 && (
        <Section title="Tags">
          <div className="flex flex-wrap gap-1">
            {trace.tags.map((tag, i) => {
              const isAuth = tag.startsWith("auth:");
              const isData = tag.startsWith("data:");
              const isError = tag.startsWith("error:");
              const color = isAuth
                ? "bg-purple-900/40 text-purple-300 border-purple-700"
                : isData
                ? "bg-blue-900/40 text-blue-300 border-blue-700"
                : isError
                ? "bg-red-900/40 text-red-300 border-red-700"
                : "bg-gray-800 text-gray-400 border-gray-700";
              return (
                <span key={i} className={`px-1.5 py-0.5 rounded border text-[10px] ${color}`}>
                  {tag}
                </span>
              );
            })}
          </div>
        </Section>
      )}

      {/* User */}
      {trace.userId && (
        <Section title="User">
          <KV label="User ID" value={trace.userId} />
          <KV label="Role" value={trace.userRole ?? "—"} />
        </Section>
      )}

      {/* Request Headers */}
      {Object.keys(trace.requestHeaders).length > 0 && (
        <Section title="Request Headers">
          {Object.entries(trace.requestHeaders).map(([k, v]) => (
            <KV key={k} label={k} value={v} />
          ))}
        </Section>
      )}

      {/* Query Params */}
      {Object.keys(trace.query).length > 0 && (
        <Section title="Query Parameters">
          {Object.entries(trace.query).map(([k, v]) => (
            <KV key={k} label={k} value={v} />
          ))}
        </Section>
      )}

      {/* Request Body */}
      {trace.requestBody && (
        <Section title="Request Body">
          <JsonBlock value={trace.requestBody} />
        </Section>
      )}

      {/* Upstream Calls */}
      {trace.upstreamCalls.length > 0 && (
        <Section title={`Upstream Calls (${trace.upstreamCalls.length})`}>
          <div className="space-y-1.5">
            {trace.upstreamCalls.map((call, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#161b22] border border-gray-800"
              >
                <span className="text-[10px] font-bold text-cyan-400 w-[90px] shrink-0 truncate">
                  {call.service}
                </span>
                <span className="text-[10px] text-gray-500 w-[32px] shrink-0">{call.method}</span>
                <span className="text-[10px] text-gray-400 flex-1 truncate">{call.url}</span>
                {call.status && (
                  <span className={`text-[10px] font-bold shrink-0 ${statusColor(call.status)}`}>
                    {call.status}
                  </span>
                )}
                {call.durationMs !== undefined && (
                  <span className="text-[10px] text-gray-600 shrink-0">{call.durationMs}ms</span>
                )}
                {call.error && (
                  <span className="text-[10px] text-red-400 truncate max-w-[120px]">
                    {call.error}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Response */}
      {trace.responseSummary && (
        <Section title="Response Summary">
          <JsonBlock value={trace.responseSummary} />
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
        {title}
      </h3>
      {children}
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 py-0.5">
      <span className="text-[10px] text-gray-600 shrink-0 w-[100px]">{label}</span>
      <span className="text-[11px] text-gray-300 break-all">{value}</span>
    </div>
  );
}

function JsonBlock({ value }: { value: string }) {
  let formatted = value;
  try {
    const parsed = JSON.parse(value);
    formatted = JSON.stringify(parsed, null, 2);
  } catch {
    // not JSON, show as-is
  }
  return (
    <pre className="bg-[#161b22] border border-gray-800 rounded p-2 text-[10px] text-gray-400 overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap break-all">
      {formatted}
    </pre>
  );
}
