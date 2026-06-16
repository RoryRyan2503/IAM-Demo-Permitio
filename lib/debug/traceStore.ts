/**
 * In-memory API trace store for the debug page.
 *
 * Captures request/response details from route handlers.
 * Keeps last 200 entries, auto-evicts oldest.
 * Server-side only — never bundled into client code.
 *
 * Uses globalThis to survive HMR reloads in development.
 */

export interface TraceEntry {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  pathname: string;
  /** Inbound request headers (filtered to relevant ones) */
  requestHeaders: Record<string, string>;
  /** Query params */
  query: Record<string, string>;
  /** Request body (for POST/PUT/PATCH, truncated) */
  requestBody?: string;
  /** Which user made the request */
  userId?: string;
  userRole?: string;
  /** Response info — filled after handler runs */
  status?: number;
  responseTime?: number;
  /** Shortened response body (JSON) */
  responseSummary?: string;
  /** Upstream calls made during this request */
  upstreamCalls: UpstreamCall[];
  /** Tags: auth-engine, data-source, permit checks, etc. */
  tags: string[];
}

export interface UpstreamCall {
  service: string;
  method: string;
  url: string;
  status?: number;
  durationMs?: number;
  error?: string;
}

const MAX_ENTRIES = 200;

interface TraceState {
  traces: TraceEntry[];
  counter: number;
  listeners: Array<(entry: TraceEntry) => void>;
}

function getState(): TraceState {
  const g = globalThis as any;
  if (!g.__apiTraceState) {
    g.__apiTraceState = { traces: [], counter: 0, listeners: [] };
  }
  return g.__apiTraceState;
}

export function createTrace(
  method: string,
  url: string,
  pathname: string,
  headers: Record<string, string>,
  query: Record<string, string>,
  body?: string
): TraceEntry {
  const state = getState();
  const entry: TraceEntry = {
    id: `trace-${++state.counter}-${Date.now()}`,
    timestamp: Date.now(),
    method,
    url,
    pathname,
    requestHeaders: headers,
    query,
    requestBody: body ? body.substring(0, 2000) : undefined,
    userId: headers["x-user-id"],
    userRole: headers["x-user-role"],
    upstreamCalls: [],
    tags: [],
  };
  return entry;
}

export function finalizeTrace(entry: TraceEntry) {
  const state = getState();
  state.traces.push(entry);
  if (state.traces.length > MAX_ENTRIES) {
    state.traces = state.traces.slice(-MAX_ENTRIES);
  }
  for (const fn of state.listeners) {
    try {
      fn(entry);
    } catch {
      // listener died
    }
  }
}

export function getTraces(limit = 100): TraceEntry[] {
  return getState().traces.slice(-limit).reverse();
}

export function clearTraces() {
  getState().traces = [];
}

export function subscribe(fn: (entry: TraceEntry) => void): () => void {
  const state = getState();
  state.listeners.push(fn);
  return () => {
    state.listeners = state.listeners.filter((l) => l !== fn);
  };
}
