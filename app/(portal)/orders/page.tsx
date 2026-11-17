/**
 * Orders Page — orders scoped to the selected account
 */

"use client";

import { useState } from "react";
import { useAccountContext } from "@/context/AccountContext";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { AccessDenied } from "@/components/permissions/AccessDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";

interface OrderDetails {
  header: unknown;
  lineItems: unknown;
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function unwrapRecord(value: unknown): JsonRecord {
  let current = value;
  for (let depth = 0; depth < 4; depth += 1) {
    if (Array.isArray(current)) current = current[0];
    const currentRecord = asRecord(current);
    const nested = ["data", "result", "order", "header", "orderHeader", "value"]
      .map((key) => currentRecord[key])
      .find((item) => item !== undefined && item !== null);
    if (nested === undefined) return currentRecord;
    current = nested;
  }
  return asRecord(current);
}

function findLineItems(value: unknown, depth = 0): JsonRecord[] {
  if (depth > 4) return [];
  if (Array.isArray(value)) return value.map(asRecord).filter((item) => Object.keys(item).length > 0);
  const record = asRecord(value);
  for (const key of ["lineItems", "lineItemDetails", "orderLineItems", "orderItems", "items", "results", "data", "result", "value"]) {
    if (record[key] !== undefined) {
      const rows = findLineItems(record[key], depth + 1);
      if (rows.length) return rows;
    }
  }
  return [];
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function labelFor(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
}

export default function OrdersPage() {
  const { selectedAccount } = useAccountContext();
  useRouteGuard("view", "orders");
  const [orderNumber, setOrderNumber] = useState("");
  const [searchedOrderNumber, setSearchedOrderNumber] = useState("");
  const [details, setDetails] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = orderNumber.trim();
    if (!selectedAccount || !value) return;

    setIsLoading(true);
    setError(null);
    setDetails(null);
    setSearchedOrderNumber(value);
    try {
      const params = new URLSearchParams({ orderNumber: value });
      const response = await fetch(`/api/orders/lookup?${params.toString()}`, {
        headers: { "x-account-id": selectedAccount.accountId },
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Failed to retrieve order details");
        return;
      }
      setDetails(payload.data ?? null);
    } catch {
      setError("Network error — could not retrieve order details");
    } finally {
      setIsLoading(false);
    }
  };

  const headerFields = details ? Object.entries(unwrapRecord(details.header)) : [];
  const lineItems = details ? findLineItems(details.lineItems) : [];
  const lineItemColumns = lineItems.length > 0 ? Object.keys(lineItems[0]).slice(0, 8) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-semibold">Order Lookup</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Account: <span className="font-medium">{selectedAccount?.accountName ?? "—"}</span>
        </p>
        </div>
        <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          Coveo / PingAuthZ
        </span>
      </div>

      <form onSubmit={handleLookup} className="flex max-w-xl items-end gap-3">
        <label className="flex-1 space-y-1.5 text-sm font-medium">
          Order number
          <Input
            value={orderNumber}
            onChange={(event) => setOrderNumber(event.target.value)}
            placeholder="Enter an order number"
            autoComplete="off"
            required
          />
        </label>
        <Button type="submit" disabled={isLoading || !selectedAccount || !orderNumber.trim()}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
          Search
        </Button>
      </form>

      {error && <AccessDenied compact message={error} />}

      {isLoading && (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading order details…
        </div>
      )}

      {!isLoading && !details && !error && (
        <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
          Enter an order number to view its header and line items.
        </div>
      )}

      {!isLoading && details && (
        <div className="space-y-4">
          <section className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-semibold">Order {searchedOrderNumber}</h2>
              <span className="text-xs text-muted-foreground">Header details</span>
            </div>
            {headerFields.length > 0 ? (
              <dl className="grid gap-x-6 gap-y-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {headerFields.filter(([, value]) => value === null || typeof value !== "object").map(([key, value]) => (
                  <div key={key} className="min-w-0">
                    <dt className="text-xs capitalize text-muted-foreground">{labelFor(key)}</dt>
                    <dd className="mt-1 break-words text-sm font-medium">{displayValue(value)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="px-4 py-5 text-sm text-muted-foreground">No header fields were returned.</p>
            )}
          </section>

          <section className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-semibold">Line items</h2>
              <span className="text-xs text-muted-foreground">{lineItems.length} returned</span>
            </div>
            {lineItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>{lineItemColumns.map((column) => <th key={column} className="whitespace-nowrap px-4 py-3 text-left font-medium capitalize text-muted-foreground">{labelFor(column)}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {lineItems.map((item, index) => (
                      <tr key={index}>
                        {lineItemColumns.map((column) => <td key={column} className="max-w-xs px-4 py-3">{displayValue(item[column])}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-4 py-5 text-sm text-muted-foreground">No line items were returned.</p>
            )}
          </section>

          <details className="rounded-lg border border-border px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium">Raw service response</summary>
            <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">{JSON.stringify(details, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
