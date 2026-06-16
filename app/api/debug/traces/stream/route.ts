/**
 * GET /api/debug/traces/stream — Server-Sent Events stream of new traces
 */

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { subscribe, type TraceEntry } from "@/lib/debug/traceStore";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial keepalive
      controller.enqueue(encoder.encode(": connected\n\n"));

      unsubscribe = subscribe((entry: TraceEntry) => {
        try {
          const data = JSON.stringify(entry);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // stream closed
        }
      });
    },
    cancel() {
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
