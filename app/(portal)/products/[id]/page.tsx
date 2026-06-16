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
import {
  ArrowLeft,
  Package,
  Minus,
  Plus,
  ShoppingCart,
  FileText,
  Loader2,
} from "lucide-react";
import { cn, formatCurrency, getCategoryColor, getProductType } from "@/lib/utils";
import { toast } from "sonner";

interface ApiProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  sku: string;
  sales_org_id: string;
  category: string;
  image_url: string | null;
  created_at: string;
}

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
  const { selectedAccount } = useAccountContext();
  const { hasPermission } = useAuth();
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pricingVisible, setPricingVisible] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  const canAddToCart = hasPermission("create", "cart");
  const productId = params.id as string;

  useEffect(() => {
    if (!selectedAccount || !productId) return;
    const fetchProduct = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/products/${productId}`, {
          headers: { "x-account-id": selectedAccount.accountId },
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
        setError("Network error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
  }, [selectedAccount, productId]);

  const handleAddToCart = useCallback(async () => {
    if (!selectedAccount || !product) return;
    setAddingToCart(true);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-account-id": selectedAccount.accountId,
        },
        body: JSON.stringify({ productId: product.id, quantity }),
      });
      if (res.ok) {
        toast.success(`Added ${quantity}× to cart`, { description: product.name });
      } else {
        toast.error("Failed to add to cart");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setAddingToCart(false);
    }
  }, [selectedAccount, product, quantity]);

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
        <AccessDenied compact message={error ?? "Product not found"} />
      </div>
    );
  }

  const color = getCategoryColor(product.category);
  const type = getProductType(product.category);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/products">
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> All products
        </Button>
      </Link>

      <div className="grid md:grid-cols-[1fr_360px] gap-8">
        {/* ── Left column ── */}
        <div className="space-y-6">
          {/* Hero gradient */}
          <div
            className="relative h-64 rounded-xl flex items-center justify-center"
            style={{
              background: `linear-gradient(145deg, color-mix(in oklab, ${color} 15%, transparent), color-mix(in oklab, ${color} 5%, transparent))`,
            }}
          >
            <Package className="h-24 w-24" style={{ color }} />
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="secondary" className="font-mono text-[11px]">
              {product.sku}
            </Badge>
            <Badge variant="secondary" className="text-[11px]">
              {product.category}
            </Badge>
            <Badge
              variant="outline"
              className="text-[11px]"
              style={{ borderColor: color, color }}
            >
              {type}
            </Badge>
            <Badge variant="secondary" className="font-mono text-[11px]">
              {product.sales_org_id}
            </Badge>
          </div>

          {/* Title & description */}
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              {product.name}
            </h1>
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
              <TabsTrigger value="specs">Specs &amp; Tags</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4">
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Product Overview
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {product.description || "No detailed description available for this product."}
                </p>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Category</p>
                    <p className="font-medium">{product.category}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="font-medium">{type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sales Org</p>
                    <p className="font-mono text-xs">{product.sales_org_id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">SKU</p>
                    <p className="font-mono text-xs">{product.sku}</p>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="specs" className="mt-4">
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Specifications
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Product ID</span>
                    <span className="font-mono text-xs">{product.id}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">SKU</span>
                    <span className="font-mono text-xs">{product.sku}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Category</span>
                    <span>{product.category}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Type</span>
                    <span>{type}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Sales Organization</span>
                    <span className="font-mono text-xs">{product.sales_org_id}</span>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Right sticky panel — Buying options ── */}
        <div className="md:sticky md:top-20 md:h-fit">
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Buying Options
            </h3>

            {/* Price */}
            <div>
              <p className="text-xs text-muted-foreground">List price</p>
              <p className="font-mono text-2xl font-semibold mt-1">
                {pricingVisible ? (
                  formatCurrency(product.price)
                ) : (
                  <span className="text-base text-muted-foreground">
                    Contact for pricing
                  </span>
                )}
              </p>
            </div>

            <Separator />

            {/* Quantity stepper */}
            {canAddToCart && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Quantity</p>
                  <div className="flex items-center border border-border rounded-lg w-fit">
                    <button
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
                      className="p-2 hover:bg-secondary transition-colors rounded-r-lg"
                      onClick={() => setQuantity((q) => q + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Line total */}
                {pricingVisible && quantity > 1 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Line total</span>
                    <span className="font-mono font-semibold">
                      {formatCurrency(product.price * quantity)}
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

            <Button variant="outline" className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              Request quote
            </Button>

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
