"use client";

/**
 * ConnectionStatusBadge — header authorization provider health indicator
 *
 * Polls /api/auth/provider-status and renders a colored dot + label:
 *   🟢 Ping Authz Connected   (PingAuthorize healthy)
 *   🟡 Local Authorization    (provider unreachable, fallback engine used)
 *   🔴 Provider Unavailable   (health check itself failed)
 */

import { useCallback, useEffect, useState } from "react";

type Status = "loading" | "connected" | "degraded" | "error";

const POLL_INTERVAL_MS = 30000;

export function ConnectionStatusBadge() {
  const [status, setStatus] = useState<Status>("loading");
  const [label, setLabel] = useState("Checking provider...");

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/provider-status");
      if (!res.ok) throw new Error("status check failed");
      const data = await res.json();

      if (data.connected) {
        setStatus("connected");
        setLabel(data.provider === "ping" ? "Ping Authz Connected" : "Provider Connected");
      } else {
        setStatus("degraded");
        setLabel("Local Authorization");
      }
    } catch {
      setStatus("error");
      setLabel("Provider Unavailable");
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [check]);

  const styles: Record<Status, string> = {
    loading: "text-gray-500 bg-gray-50 border-gray-200",
    connected: "text-emerald-700 bg-emerald-50 border-emerald-200",
    degraded: "text-amber-700 bg-amber-50 border-amber-200",
    error: "text-red-700 bg-red-50 border-red-200",
  };

  const dotStyles: Record<Status, string> = {
    loading: "bg-gray-300",
    connected: "bg-emerald-500",
    degraded: "bg-amber-500",
    error: "bg-red-500",
  };

  return (
    <span
      className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border ${styles[status]}`}
      title="Active authorization provider health"
    >
      {status === "loading" ? (
        <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full ${dotStyles[status]} ${status === "connected" ? "animate-pulse" : ""}`} />
      )}
      {status === "loading" ? "Checking provider..." : label}
    </span>
  );
}
