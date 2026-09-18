/**
 * Cart Page — redesigned with grouped line items, qty steppers, order summary
 */

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAccountContext } from "@/context/AccountContext";
import { useAuth } from "@/context/AuthContext";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { AccessDenied } from "@/components/permissions/AccessDenied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  Package,
  ArrowRight,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { cn, formatCurrency, getCategoryColor, getProductType } from "@/lib/utils";
import { toast } from "sonner";

interface CartProduct {
  id: string;
  name: string;
  price: number;
  sku: string;
  sales_org_id: string;
  category: string;
}

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  added_at: string;
  products: CartProduct | null;
}

interface CartMeta {
  total: number;
  itemCount: number;
}

export default function CartPage() {
  return (
    <PermissionGate action="view" resource="cart" fallback={<AccessDenied />}>
      <CartContent />
    </PermissionGate>
  );
}

function CartContent() {
  const { selectedAccount } = useAccountContext();
  useRouteGuard("view", "cart");
  const [items, setItems] = useState<CartItem[]>([]);
  const [meta, setMeta] = useState<CartMeta>({ total: 0, itemCount: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [updatingQty, setUpdatingQty] = useState<string | null>(null);

  const fetchCart = useCallback(async () => {
    if (!selectedAccount) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cart", {
        headers: { "x-account-id": selectedAccount.accountId },
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to load cart");
        return;
      }
      const data = await res.json();
      setItems(data.data ?? []);
      setMeta(data.meta ?? { total: 0, itemCount: 0 });
    } catch {
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccount]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  /* Group items by sales org */
  const grouped = useMemo(() => {
    const map = new Map<string, CartItem[]>();
    for (const item of items) {
      const org = item.products?.sales_org_id ?? "Unknown";
      const list = map.get(org) ?? [];
      list.push(item);
      map.set(org, list);
    }
    return map;
  }, [items]);

  const handleRemove = useCallback(
    async (productId: string) => {
      if (!selectedAccount) return;
      setRemoving(productId);
      try {
        const res = await fetch(
          `/api/cart?productId=${encodeURIComponent(productId)}`,
          {
            method: "DELETE",
            headers: { "x-account-id": selectedAccount.accountId },
          }
        );
        if (res.ok) {
          toast.success("Removed from cart");
          await fetchCart();
        } else {
          toast.error("Failed to remove item");
        }
      } catch {
        toast.error("Network error");
      } finally {
        setRemoving(null);
      }
    },
    [selectedAccount, fetchCart]
  );

  const handleUpdateQty = useCallback(
    async (productId: string, newQty: number) => {
      if (!selectedAccount || newQty < 1) return;
      setUpdatingQty(productId);
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-account-id": selectedAccount.accountId,
          },
          body: JSON.stringify({ productId, quantity: newQty }),
        });
        if (res.ok) {
          await fetchCart();
        } else {
          toast.error("Failed to update quantity");
        }
      } catch {
        toast.error("Network error");
      } finally {
        setUpdatingQty(null);
      }
    },
    [selectedAccount, fetchCart]
  );

  const handleClearCart = useCallback(async () => {
    if (!selectedAccount || items.length === 0) return;
    for (const item of items) {
      await fetch(
        `/api/cart?productId=${encodeURIComponent(item.product_id)}`,
        {
          method: "DELETE",
          headers: { "x-account-id": selectedAccount.accountId },
        }
      );
    }
    toast.success("Cart cleared");
    await fetchCart();
  }, [selectedAccount, items, fetchCart]);

  /* Per-org subtotals */
  const orgSubtotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const [org, orgItems] of Array.from(grouped)) {
      const subtotal = orgItems.reduce(
        (sum: number, item: CartItem) => sum + (item.products?.price ?? 0) * item.quantity,
        0
      );
      map.set(org, subtotal);
    }
    return map;
  }, [grouped]);

  const estimatedTotal = useMemo(
    () => Array.from(orgSubtotals.values()).reduce((a, b) => a + b, 0),
    [orgSubtotals]
  );

  /* ================================================================ */
  /* RENDER                                                            */
  /* ================================================================ */

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-24 bg-muted animate-pulse rounded" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="pb-4 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Cart
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {items.length === 0
                ? "Your cart is empty"
                : `${meta.itemCount} item${meta.itemCount !== 1 ? "s" : ""} across ${grouped.size} sales org${grouped.size !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedAccount && (
              <Badge variant="secondary" className="font-mono text-[11px]">
                {selectedAccount.accountName}
              </Badge>
            )}
            {items.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive text-xs"
                onClick={handleClearCart}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            )}
          </div>
        </div>
      </div>

      {error && <AccessDenied compact message={error} />}

      {/* ── Empty state ── */}
      {items.length === 0 && !error && (
        <div className="text-center py-16">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">
            Your cart is empty
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Add products from the catalog to get started.
          </p>
          <Link href="/products">
            <Button variant="outline" size="sm" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-1" /> Browse products
            </Button>
          </Link>
        </div>
      )}

      {/* ── Cart items + summary ── */}
      {items.length > 0 && (
        <div className="grid md:grid-cols-[1fr_360px] gap-8">
          {/* Left — grouped cart items */}
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([org, orgItems]) => {
              const color = getCategoryColor(orgItems[0]?.products?.category ?? "");
              const subtotal = orgSubtotals.get(org) ?? 0;
              return (
                <div
                  key={org}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  {/* Group header */}
                  <div
                    className="px-5 py-3 flex items-center justify-between"
                    style={{
                      background: `linear-gradient(90deg, color-mix(in oklab, ${color} 8%, transparent), transparent)`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="font-mono text-[11px]"
                      >
                        {org}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {orgItems.length} item{orgItems.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <span className="font-mono text-sm font-semibold">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>

                  {/* Line items */}
                  <div className="divide-y divide-border/50">
                    {orgItems.map((item) => {
                      const p = item.products;
                      if (!p) return null;
                      const itemColor = getCategoryColor(p.category);
                      const isRemoving = removing === item.product_id;
                      const isUpdating = updatingQty === item.product_id;

                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 p-4"
                        >
                          {/* Product icon */}
                          <div
                            className="shrink-0 h-12 w-12 rounded-lg flex items-center justify-center"
                            style={{
                              background: `linear-gradient(145deg, color-mix(in oklab, ${itemColor} 12%, transparent), color-mix(in oklab, ${itemColor} 4%, transparent))`,
                            }}
                          >
                            <Package
                              className="h-6 w-6"
                              style={{ color: itemColor }}
                            />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <Link href={`/products/${p.id}`}>
                              <h4 className="text-sm font-semibold hover:text-primary transition-colors line-clamp-1">
                                {p.name}
                              </h4>
                            </Link>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {p.sku}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {p.category}
                              </span>
                            </div>
                          </div>

                          {/* Unit price */}
                          <div className="shrink-0 text-right hidden sm:block">
                            <p className="text-[10px] text-muted-foreground">
                              Unit
                            </p>
                            <p className="font-mono text-xs">
                              {formatCurrency(p.price)}
                            </p>
                          </div>

                          {/* Qty stepper */}
                          <div className="shrink-0 flex items-center border border-border rounded-lg">
                            <button
                              className="p-1.5 hover:bg-secondary transition-colors rounded-l-lg disabled:opacity-50"
                              disabled={
                                item.quantity <= 1 || isUpdating
                              }
                              onClick={() =>
                                handleUpdateQty(
                                  item.product_id,
                                  item.quantity - 1
                                )
                              }
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="px-3 font-mono text-xs min-w-[2rem] text-center">
                              {isUpdating ? (
                                <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                              ) : (
                                item.quantity
                              )}
                            </span>
                            <button
                              className="p-1.5 hover:bg-secondary transition-colors rounded-r-lg disabled:opacity-50"
                              disabled={isUpdating}
                              onClick={() =>
                                handleUpdateQty(
                                  item.product_id,
                                  item.quantity + 1
                                )
                              }
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Line subtotal */}
                          <div className="shrink-0 w-24 text-right">
                            <p className="font-mono text-sm font-semibold">
                              {formatCurrency(p.price * item.quantity)}
                            </p>
                          </div>

                          {/* Remove */}
                          <button
                            className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                            disabled={isRemoving}
                            onClick={() => handleRemove(item.product_id)}
                          >
                            {isRemoving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right — Order summary */}
          <div className="md:sticky md:top-20 md:h-fit">
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Order Summary
              </h3>

              {/* Per-org breakdown */}
              <div className="space-y-3">
                {Array.from(orgSubtotals.entries()).map(([org, subtotal]) => (
                  <div key={org} className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-mono text-xs">
                      {org}
                    </span>
                    <span className="font-mono">{formatCurrency(subtotal)}</span>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Total */}
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-muted-foreground">Estimated total</p>
                  <p className="text-[10px] text-muted-foreground">
                    Taxes & shipping calculated at checkout
                  </p>
                </div>
                <p className="font-mono text-xl font-semibold">
                  {formatCurrency(estimatedTotal)}
                </p>
              </div>

              <Separator />

              <Button className="w-full" size="lg">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Proceed to checkout
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              <Link href="/products" className="block">
                <Button variant="outline" className="w-full" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Continue shopping
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
