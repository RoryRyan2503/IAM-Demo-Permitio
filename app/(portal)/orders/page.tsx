/**
 * Orders Page — orders scoped to the selected account
 */

"use client";

import { useEffect, useState } from "react";
import { useAccountContext } from "@/context/AccountContext";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { AccessDenied } from "@/components/permissions/AccessDenied";

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface Order {
  id: string;
  status: string;
  total: number;
  created_at: string;
  order_items: OrderItem[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function OrdersPage() {
  const { selectedAccount } = useAccountContext();
  useRouteGuard("view", "orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedAccount) return;

    const fetchOrders = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/orders", {
          headers: { "x-account-id": selectedAccount.accountId },
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Failed to load orders");
          return;
        }
        const data = await res.json();
        setOrders(data.data ?? []);
      } catch {
        setError("Network error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [selectedAccount]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Account: <span className="font-medium">{selectedAccount?.accountName ?? "—"}</span>
        </p>
      </div>

      {error && <AccessDenied compact message={error} />}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse h-16 rounded-lg border border-border bg-card" />
          ))}
        </div>
      )}

      {!isLoading && orders.length === 0 && !error && (
        <div className="text-center py-12 text-muted-foreground">No orders found for this account.</div>
      )}

      {!isLoading && orders.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Items</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((order) => (
                <tr key={order.id} className="bg-card hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{order.id.slice(0, 8)}…</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-800"}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {order.order_items?.length ?? 0} item{(order.order_items?.length ?? 0) !== 1 ? "s" : ""}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    ${(order.total / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()}
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
