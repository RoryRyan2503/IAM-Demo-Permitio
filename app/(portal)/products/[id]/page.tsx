/**
 * Product Detail Page
 *
 * 2-column layout with hero gradient, tabs, and sticky buying panel.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAccountContext } from "@/context/AccountContext";
import { useAuth } from "@/context/AuthContext";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { AccessDenied } from "@/components/permissions/AccessDenied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductImage } from "@/components/products/ProductImage";
import type { CoveoProduct as ApiProduct } from "@/services/coveo/client";
import {
  ArrowLeft,
  Minus,
  Plus,
  ShoppingCart,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

export default function ProductDetailPage() {
  return (
    <PermissionGate action="view" resource="products" fallback={<AccessDenied />}>
      <ProductDetailContent />
    </PermissionGate>
  );
}

function ProductDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { selectedAccount, selectedCurrency, isLoading: accountLoading } = useAccountContext();
  const { hasPermission } = useAuth();
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pricingVisible, setPricingVisible] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  const canAddToCart = hasPermission("create", "cart");
  const productId = params.id as string;
  const selectedAccountId = selectedAccount?.accountId;

  useEffect(() => {
    if (accountLoading) return;
    if (!selectedAccountId || !productId) {
      setProduct(null);
      setError("Select a Sold-To account to view product details.");
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    const fetchProduct = async () => {
      setIsLoading(true);
      setError(null);
      setProduct(null);
      setQuantity(1);
      try {
        const res = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
          headers: {
            "x-account-id": selectedAccountId,
            "x-selected-currency": selectedCurrency,
          },
          signal: controller.signal,
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Product not found");
          return;
        }
        const data = await res.json();
        setProduct(data.data ?? null);
        setPricingVisible(data.meta?.pricingVisible ?? true);
      } catch {
        if (!controller.signal.aborted) setError("Network error");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    void fetchProduct();
    return () => controller.abort();
  }, [selectedAccountId, accountLoading, selectedCurrency, productId]);

  const handleAddToCart = useCallback(async () => {
    if (!selectedAccount || !product) return;
    setAddingToCart(true);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-account-id": selectedAccount.accountId,
          "x-selected-currency": selectedCurrency,
        },
        body: JSON.stringify({ productId: product.id, sku: product.sku, quantity }),
      });
      if (res.ok) {
        toast.success(`Added ${quantity}× to cart`, { description: product.name });
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Failed to add to cart");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setAddingToCart(false);
    }
  }, [selectedAccount, selectedCurrency, product, quantity]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="grid md:grid-cols-[1fr_360px] gap-8">
          <div className="space-y-4">
            <div className="h-64 bg-muted animate-pulse rounded-xl" />
            <div className="h-6 w-48 bg-muted animate-pulse rounded" />
            <div className="h-20 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-80 bg-muted animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="rounded-xl border border-border bg-card p-6 text-sm" role="alert">
          {error ?? "Product not found"}
        </div>
      </div>
    );
  }

  const specifications = [
    ["SKU", product.sku],
    ["Product family", product.familyName],
    ["Product ID", product.productId],
    ["Brand", product.brand],
    ["Business", product.business],
    ["Category", product.categoryPath.join(" / ") || product.category],
    ["Catalog country", product.country.toUpperCase()],
    ["Available countries", product.availableCountries.map((country) => country.toUpperCase()).join(", ")],
    ["Unit of measure", product.unitOfMeasure],
    ["Catalog domain", product.domain],
    ["Sales organization", product.sales_org_id],
  ].filter(([, value]) => Boolean(value));

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/products">
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> All products
        </Button>
      </Link>

      <div className="space-y-3">
        {product.categoryPath.length > 0 && (
          <p className="text-xs leading-relaxed text-muted-foreground">{product.categoryPath.join(" / ")}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {product.brand && <Badge variant="secondary">{product.brand}</Badge>}
          {product.business && <Badge variant="outline">{product.business}</Badge>}
          {product.category && <Badge variant="outline">{product.category}</Badge>}
        </div>
        <h1 className="break-words text-2xl font-semibold tracking-tight md:text-3xl">{product.name}</h1>
        {product.familyName && product.familyName !== product.name && (
          <p className="text-base text-muted-foreground">{product.familyName}</p>
        )}
        {product.sku && <p className="break-all font-mono text-xs text-muted-foreground">SKU {product.sku}</p>}
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* ── Left column ── */}
        <div className="min-w-0 space-y-6">
          <ProductImage src={product.image_url} name={product.name} className="h-64 w-full rounded-xl sm:h-80" />

          {/* Title & description */}
          <div>
            <h2 className="text-sm font-semibold">Product description</h2>
            {product.description && (
              <p className="text-muted-foreground mt-2 leading-relaxed">
                {product.description}
              </p>
            )}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="specs">Product information</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4">
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Product Overview
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {product.familyDescription || product.description || product.longDescription || "No additional overview is available for this product."}
                </p>
                {product.longDescription && product.longDescription !== (product.familyDescription || product.description) && (
                  <details className="border-t border-border pt-4">
                    <summary className="cursor-pointer text-sm font-medium">Full product overview</summary>
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                      {product.longDescription}
                    </p>
                  </details>
                )}
              </div>
            </TabsContent>
            <TabsContent value="specs" className="mt-4">
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Product information
                </h3>
                <dl className="divide-y divide-border/50 text-sm">
                  {specifications.map(([label, value]) => (
                    <div key={label} className="grid gap-1 py-3 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-4">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="break-words font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Right sticky panel — Buying options ── */}
        <div className="xl:sticky xl:top-20 xl:h-fit">
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Buying Options
            </h3>
            {selectedAccount && (
              <div className="rounded-lg bg-secondary/50 p-3 text-sm">
                <p className="text-xs text-muted-foreground">Selected Sold-To</p>
                <p className="mt-1 break-words font-medium">{selectedAccount.accountName}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{selectedAccount.accountNumber}</p>
              </div>
            )}

            {/* Price */}
            <div>
              <p className="text-xs text-muted-foreground">List price · {product.currency}{product.unitOfMeasure && ` / ${product.unitOfMeasure}`}</p>
              <p className="text-xl font-semibold mt-1">
                {pricingVisible ? (
                  product.price !== null ? formatCurrency(product.price, product.currency) : "Price unavailable"
                ) : (
                  <span className="text-base text-muted-foreground">
                    Contact for pricing
                  </span>
                )}
              </p>
              {pricingVisible && product.price === null && (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  The catalog does not provide a displayable price for this item.
                </p>
              )}
            </div>

            <Separator />

            {/* Quantity stepper */}
            {canAddToCart && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Quantity</p>
                  <div className="flex items-center border border-border rounded-lg w-fit">
                    <button
                      aria-label="Decrease quantity"
                      className="p-2 hover:bg-secondary transition-colors rounded-l-lg disabled:opacity-50"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="px-4 font-mono text-sm min-w-[3rem] text-center">
                      {quantity}
                    </span>
                    <button
                      aria-label="Increase quantity"
                      className="p-2 hover:bg-secondary transition-colors rounded-r-lg"
                      onClick={() => setQuantity((q) => q + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Line total */}
                {pricingVisible && product.price !== null && quantity > 1 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Line total</span>
                    <span className="font-mono font-semibold">
                      {formatCurrency(product.price * quantity, product.currency)}
                    </span>
                  </div>
                )}

                <Separator />

                <Button
                  className="w-full"
                  disabled={addingToCart}
                  onClick={handleAddToCart}
                >
                  {addingToCart ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ShoppingCart className="h-4 w-4 mr-2" />
                  )}
                  Add to cart
                </Button>
              </>
            )}

            {!pricingVisible && (
              <p className="text-xs text-muted-foreground text-center">
                Pricing requires elevated permissions
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
