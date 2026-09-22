/**
 * Quotes Page
 *
 * Demonstrates ABAC persona check:
 *   - All buyers can VIEW quotes
 *   - Only PROCUREMENT persona can CREATE quotes
 *   - Viewers see nothing (redirected server-side, blocked client-side)
 */

"use client";

import { useEffect, useState } from "react";
import { useAccountContext } from "@/context/AccountContext";
import { useAuth } from "@/context/AuthContext";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { AccessDenied } from "@/components/permissions/AccessDenied";

interface Quote {
  id: string;
  status: string;
  total: number;
  valid_until: string | null;
  created_at: string;
  quote_items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    discount_pct: number;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-orange-100 text-orange-800",
};

export default function QuotesPage() {
  const { selectedAccount } = useAccountContext();
  const { user } = useAuth();
  const selectedAccountId = selectedAccount?.accountId;
  useRouteGuard("view", "quotes");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedAccountId) return;

    const fetchQuotes = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/quotes", {
          headers: { "x-account-id": selectedAccountId },
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Failed to load quotes");
          return;
        }
        const data = await res.json();
        setQuotes(data.data ?? []);
      } catch {
        setError("Network error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuotes();
  }, [selectedAccountId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Quotes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            RFQs and pricing agreements for{" "}
            <span className="font-medium">{selectedAccount?.accountName ?? "—"}</span>
          </p>
        </div>

        {/* Create quote — only procurement persona */}
        <PermissionGate
          action="create"
          resource="quotes"
          fallback={
            user?.persona !== "procurement" ? (
              <span className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-1.5">
                Requires procurement persona
              </span>
            ) : null
          }
        >
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            + Create Quote
          </button>
        </PermissionGate>
      </div>

      {/* Persona context note */}
      <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <strong>ABAC demo:</strong> Your persona is <strong>{user?.persona ?? "—"}</strong>.
        {user?.persona === "procurement"
          ? " You can create quotes."
          : " Only procurement persona can create quotes."}
      </div>

      {error && <AccessDenied compact message={error} />}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse h-16 rounded-lg border border-border bg-card" />
          ))}
        </div>
      )}

      {!isLoading && quotes.length === 0 && !error && (
        <div className="text-center py-12 text-muted-foreground">No quotes found.</div>
      )}

      {!isLoading && quotes.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Quote ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Items</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Valid Until</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {quotes.map((quote) => (
                <tr key={quote.id} className="bg-card hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{quote.id.slice(0, 8)}…</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[quote.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {quote.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {quote.quote_items?.length ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    ${(quote.total / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {quote.valid_until
                      ? new Date(quote.valid_until).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
