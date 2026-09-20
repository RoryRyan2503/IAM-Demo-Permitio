/**
 * Audit log — in-memory record of authorization decisions.
 * ============================================================================
 * Every AuthorizationService.checkAccess() call appends an entry here.
 * Surfaced in the Admin Console "Overview" panel (recent decisions) and used
 * by the Decision Testing Console to show provider comparisons.
 *
 * Same pattern as lib/debug/traceStore.ts — globalThis-backed ring buffer,
 * server-side only, capped size, survives HMR in dev.
 */

export interface AuditLogEntry {
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

const MAX_ENTRIES = 500;

function getState(): { entries: AuditLogEntry[]; counter: number } {
  const g = globalThis as unknown as { __authAuditLogState?: { entries: AuditLogEntry[]; counter: number } };
  if (!g.__authAuditLogState) g.__authAuditLogState = { entries: [], counter: 0 };
  return g.__authAuditLogState;
}

export function recordDecision(entry: Omit<AuditLogEntry, "id" | "timestamp">): AuditLogEntry {
  const state = getState();
  const full: AuditLogEntry = {
    ...entry,
    id: `audit-${++state.counter}-${Date.now()}`,
    timestamp: Date.now(),
  };
  state.entries.push(full);
  if (state.entries.length > MAX_ENTRIES) {
    state.entries = state.entries.slice(-MAX_ENTRIES);
  }
  return full;
}

export function getRecentDecisions(limit = 50): AuditLogEntry[] {
  return getState().entries.slice(-limit).reverse();
}

export function clearAuditLog(): void {
  getState().entries = [];
}
