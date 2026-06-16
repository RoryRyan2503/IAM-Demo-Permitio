/**
 * withTrace — wraps a Next.js Route Handler to capture request/response traces.
 *
 * Usage:
 *   export const GET = withTrace(async (req) => { ... return NextResponse.json(...) });
 */

import { NextRequest, NextResponse } from "next/server";
import { createTrace, finalizeTrace, type TraceEntry } from "./traceStore";

const RELEVANT_HEADERS = [
  "x-user-id",
  "x-user-role",
  "x-account-id",
  "content-type",
  "cookie",
  "referer",
  "user-agent",
];

function pickHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of RELEVANT_HEADERS) {
    const val = headers.get(key);
    if (val) {
      // Redact full cookie value, just show key names
      if (key === "cookie") {
        result[key] = val
          .split(";")
          .map((c) => c.trim().split("=")[0])
          .join(", ");
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

function pickQuery(url: URL): Record<string, string> {
  const result: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    result[k] = v;
  });
  return result;
}

function summarizeBody(body: any): string {
  if (!body) return "";
  try {
    const str = typeof body === "string" ? body : JSON.stringify(body);
    return str.length > 800 ? str.substring(0, 800) + "…" : str;
  } catch {
    return "[unserializable]";
  }
}

type RouteHandler = (
  req: NextRequest,
  ctx?: any
) => Promise<NextResponse | Response>;

export function withTrace(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, ctx?: any) => {
    const url = new URL(req.url);

    // Skip tracing for the debug endpoints themselves
    if (url.pathname.startsWith("/api/debug")) {
      return handler(req, ctx);
    }

    const trace = createTrace(
      req.method,
      req.url,
      url.pathname,
      pickHeaders(req.headers),
      pickQuery(url)
    );

    // Try to capture request body for mutations
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      try {
        const cloned = req.clone();
        const text = await cloned.text();
        trace.requestBody = summarizeBody(text);
      } catch {
        // body may already be consumed
      }
    }

    const start = performance.now();

    try {
      const response = await handler(req, ctx);
      trace.status = response.status;
      trace.responseTime = Math.round(performance.now() - start);

      // Try to capture response summary
      try {
        const cloned = response.clone();
        const text = await cloned.text();
        trace.responseSummary = summarizeBody(text);
      } catch {
        // streaming response etc.
      }

      finalizeTrace(trace);
      return response;
    } catch (err: any) {
      trace.status = 500;
      trace.responseTime = Math.round(performance.now() - start);
      trace.tags.push(`error:${err?.message?.substring(0, 100)}`);
      finalizeTrace(trace);
      throw err;
    }
  };
}

/**
 * Add an upstream call record to the current trace.
 * Call this from within Supabase/Permit/fetch wrappers.
 */
export function addUpstreamCall(trace: TraceEntry, call: TraceEntry["upstreamCalls"][0]) {
  trace.upstreamCalls.push(call);
}
