/**
 * Products Page — Untitled UI design language
 *
 * Demonstrates data-level ABAC:
 *   - Products are filtered server-side by the user's allowed sales orgs
 *   - Pricing is masked for viewers (no view_pricing permission)
 */

"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAccountContext } from "@/context/AccountContext";
import { useAuth } from "@/context/AuthContext";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { AccessDenied } from "@/components/permissions/AccessDenied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  X,
  LayoutGrid,
  List,
  SlidersHorizontal,
  Package,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { cn, formatCurrency, getCategoryColor, getProductType, getSalesOrgStyle } from "@/lib/utils";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Types for the raw API response (snake_case from Supabase)           */
/* ------------------------------------------------------------------ */
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

export default function ProductsPage() {
  return (
    <PermissionGate action="view" resource="products" fallback={<AccessDenied />}>
      <ProductsContent />
    </PermissionGate>
  );
}

function ProductsContent() {
  const { selectedAccount } = useAccountContext();
  const { hasPermission } = useAuth();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pricingVisible, setPricingVisible] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  /* View & search state */
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedOrgs, setSelectedOrgs] = useState<Set<string>>(new Set());
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const canAddToCart = hasPermission("create", "cart");

  /* ---------------------------------------------------------------- */
  /* Fetch products                                                    */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (!selectedAccount) return;
    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/products", {
          headers: { "x-account-id": selectedAccount.accountId },
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Failed to load products");
          return;
        }
        const data = await res.json();
        setProducts(data.data ?? []);
        setPricingVisible(data.meta?.pricingVisible ?? true);
      } catch {
        setError("Network error — could not load products");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, [selectedAccount]);

  /* ---------------------------------------------------------------- */
  /* Derived filter options                                            */
  /* ---------------------------------------------------------------- */
  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))).sort(),
    [products]
  );
  const types = useMemo(
    () => Array.from(new Set(products.map((p) => getProductType(p.category)))).sort(),
    [products]
  );
  const orgs = useMemo(
    () => Array.from(new Set(products.map((p) => p.sales_org_id))).sort(),
    [products]
  );

  /* ---------------------------------------------------------------- */
  /* Filtered products                                                 */
  /* ---------------------------------------------------------------- */
  const filtered = useMemo(() => {
    let result = products;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }
    if (selectedCategories.size > 0)
      result = result.filter((p) => selectedCategories.has(p.category));
    if (selectedTypes.size > 0)
      result = result.filter((p) => selectedTypes.has(getProductType(p.category)));
    if (selectedOrgs.size > 0)
      result = result.filter((p) => selectedOrgs.has(p.sales_org_id));
    return result;
  }, [products, searchQuery, selectedCategories, selectedTypes, selectedOrgs]);

  const activeFilterCount =
    selectedCategories.size + selectedTypes.size + selectedOrgs.size;

  const clearAllFilters = () => {
    setSelectedCategories(new Set());
    setSelectedTypes(new Set());
    setSelectedOrgs(new Set());
    setSearchQuery("");
  };

  /* ---------------------------------------------------------------- */
  /* Add to cart                                                       */
  /* ---------------------------------------------------------------- */
  const handleAddToCart = useCallback(
    async (product: ApiProduct) => {
      if (!selectedAccount) return;
      setAddingToCart(product.id);
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-account-id": selectedAccount.accountId,
          },
          body: JSON.stringify({ productId: product.id, quantity: 1 }),
        });
        if (res.ok) {
          toast.success("Added to cart", { description: product.name });
        } else {
          toast.error("Failed to add to cart");
        }
      } catch {
        toast.error("Network error");
      } finally {
        setAddingToCart(null);
      }
    },
    [selectedAccount]
  );

  /* ---------------------------------------------------------------- */
  /* Filter toggle helper                                              */
  /* ---------------------------------------------------------------- */
  const toggleFilter = (
    set: Set<string>,
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    value: string
  ) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  };

  /* ---------------------------------------------------------------- */
  /* Filter sidebar content (shared between desktop & mobile)          */
  /* ---------------------------------------------------------------- */
  const filterContent = (
    <div className="space-y-6">
      {/* Category */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Category
        </h4>
        <div className="space-y-2">
          {categories.map((cat) => (
            <label key={cat} className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox
                checked={selectedCategories.has(cat)}
                onCheckedChange={() =>
                  toggleFilter(selectedCategories, setSelectedCategories, cat)
                }
              />
              <span>{cat}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {products.filter((p) => p.category === cat).length}
              </span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {/* Type */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Type
        </h4>
        <div className="space-y-2">
          {types.map((t) => (
            <label key={t} className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox
                checked={selectedTypes.has(t)}
                onCheckedChange={() =>
                  toggleFilter(selectedTypes, setSelectedTypes, t)
                }
              />
              <span>{t}</span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {/* Sales Org */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Sales Org
        </h4>
        <div className="space-y-2">
          {orgs.map((org) => (
            <label key={org} className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox
                checked={selectedOrgs.has(org)}
                onCheckedChange={() =>
                  toggleFilter(selectedOrgs, setSelectedOrgs, org)
                }
              />
              <span className="font-mono text-xs">{org}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {products.filter((p) => p.sales_org_id === org).length}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  /* ================================================================ */
  /* RENDER                                                            */
  /* ================================================================ */
  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="pb-4 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Products
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Browse the product catalog for your authorized sales organizations
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {selectedAccount && (
              <Badge variant="secondary" className="font-mono text-[11px]">
                {selectedAccount.accountName}
              </Badge>
            )}
            {!pricingVisible && (
              <Badge
                variant="outline"
                className="text-amber-600 border-amber-300 bg-amber-50 text-[11px]"
              >
                Pricing hidden
              </Badge>
            )}
          </div>
        </div>
      </div>

      {error && <AccessDenied compact message={error} />}

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Mobile filter button */}
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-1" />
            Filters
            {activeFilterCount > 0 && (
              <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                viewMode === "grid"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                viewMode === "list"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {Array.from(selectedCategories).map((cat) => (
              <Badge key={cat} variant="secondary" className="gap-1 pr-1">
                {cat}
                <button
                  onClick={() =>
                    toggleFilter(selectedCategories, setSelectedCategories, cat)
                  }
                  className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {Array.from(selectedTypes).map((t) => (
              <Badge key={t} variant="secondary" className="gap-1 pr-1">
                {t}
                <button
                  onClick={() => toggleFilter(selectedTypes, setSelectedTypes, t)}
                  className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {Array.from(selectedOrgs).map((org) => (
              <Badge key={org} variant="secondary" className="gap-1 pr-1 font-mono">
                {org}
                <button
                  onClick={() => toggleFilter(selectedOrgs, setSelectedOrgs, org)}
                  className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <button
              onClick={clearAllFilters}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Main content with sidebar ── */}
      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-56 shrink-0">{filterContent}</aside>

        {/* Mobile filter panel */}
        {mobileFiltersOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileFiltersOpen(false)}
            />
            <div className="absolute right-0 top-0 bottom-0 w-80 bg-background border-l border-border p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold">Filters</h3>
                <button onClick={() => setMobileFiltersOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              {filterContent}
            </div>
          </div>
        )}

        {/* Product grid / list */}
        <div className="flex-1 min-w-0">
          {isLoading && (
            <div
              className={cn(
                "gap-4",
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                  : "flex flex-col"
              )}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "animate-pulse rounded-xl border border-border bg-card",
                    viewMode === "grid" ? "h-[340px]" : "h-24"
                  )}
                />
              ))}
            </div>
          )}

          {!isLoading && filtered.length === 0 && !error && (
            <div className="text-center py-16">
              <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">
                No products found.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {activeFilterCount > 0
                  ? "Try adjusting your filters."
                  : "Check your account selection."}
              </p>
            </div>
          )}

          {!isLoading && filtered.length > 0 && viewMode === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((product) => (
                <ProductCardGrid
                  key={product.id}
                  product={product}
                  pricingVisible={pricingVisible}
                  canAddToCart={canAddToCart}
                  addingToCart={addingToCart}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          )}

          {!isLoading && filtered.length > 0 && viewMode === "list" && (
            <div className="flex flex-col gap-3">
              {filtered.map((product) => (
                <ProductCardList
                  key={product.id}
                  product={product}
                  pricingVisible={pricingVisible}
                  canAddToCart={canAddToCart}
                  addingToCart={addingToCart}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          )}

          {!isLoading && filtered.length > 0 && (
            <p className="text-xs text-muted-foreground mt-4">
              Showing {filtered.length} of {products.length} products
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==================================================================== */
/* Product Card — Grid View                                              */
/* ==================================================================== */
interface ProductCardProps {
  product: ApiProduct;
  pricingVisible: boolean;
  canAddToCart: boolean;
  addingToCart: string | null;
  onAddToCart: (p: ApiProduct) => void;
}

function ProductCardGrid({
  product,
  pricingVisible,
  canAddToCart,
  addingToCart,
  onAddToCart,
}: ProductCardProps) {
  const orgStyle = getSalesOrgStyle(product.sales_org_id);
  const color = orgStyle.hex;
  const type = getProductType(product.category);
  const isAdding = addingToCart === product.id;

  return (
    <div className="group rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all flex flex-col">
      {/* Icon area */}
      <div
        className="relative h-40 rounded-t-xl flex items-center justify-center"
        style={{
          background: `linear-gradient(145deg, color-mix(in oklab, ${color} 12%, transparent), color-mix(in oklab, ${color} 4%, transparent))`,
        }}
      >
        <Package
          className="h-16 w-16 transition-transform group-hover:scale-105"
          style={{ color }}
        />
        <Badge
          className="absolute top-3 right-3 font-mono text-[10px] text-white border-0"
          style={{ backgroundColor: color }}
        >
          {product.sales_org_id}
        </Badge>
        <Badge variant="secondary" className="absolute top-3 left-3 text-[10px]">
          {type}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div>
          <p className="font-mono text-[10px] text-muted-foreground">{product.sku}</p>
          <Link href={`/products/${product.id}`}>
            <h3 className="text-sm font-semibold mt-0.5 group-hover:text-primary transition-colors line-clamp-2">
              {product.name}
            </h3>
          </Link>
          {product.description && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
              {product.description}
            </p>
          )}
        </div>

        <div className="border-t border-border/50 mt-auto pt-3 flex items-end justify-between">
          <span className="font-mono text-lg font-semibold">
            {pricingVisible ? (
              formatCurrency(product.price)
            ) : (
              <span className="text-sm text-muted-foreground">Price hidden</span>
            )}
          </span>
          <span className="text-[11px] text-muted-foreground">{product.category}</span>
        </div>

        <div className="flex gap-2">
          <Link href={`/products/${product.id}`} className="flex-1">
            <Button
              variant="outline"
              className="w-full group-hover:border-primary/50 group-hover:bg-primary/5 text-xs"
              size="sm"
            >
              View details
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
          {canAddToCart && (
            <Button
              size="sm"
              className="text-xs shrink-0"
              disabled={isAdding}
              onClick={() => onAddToCart(product)}
            >
              {isAdding ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Add"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==================================================================== */
/* Product Card — List View                                              */
/* ==================================================================== */
function ProductCardList({
  product,
  pricingVisible,
  canAddToCart,
  addingToCart,
  onAddToCart,
}: ProductCardProps) {
  const orgStyle = getSalesOrgStyle(product.sales_org_id);
  const color = orgStyle.hex;
  const type = getProductType(product.category);
  const isAdding = addingToCart === product.id;

  return (
    <div className="group flex items-center gap-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all p-4">
      {/* Icon */}
      <div
        className="shrink-0 h-16 w-16 rounded-lg flex items-center justify-center"
        style={{
          background: `linear-gradient(145deg, color-mix(in oklab, ${color} 12%, transparent), color-mix(in oklab, ${color} 4%, transparent))`,
        }}
      >
        <Package className="h-8 w-8" style={{ color }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-muted-foreground">
            {product.sku}
          </span>
          <Badge variant="secondary" className="text-[10px]">
            {type}
          </Badge>
        </div>
        <Link href={`/products/${product.id}`}>
          <h3 className="text-sm font-semibold group-hover:text-primary transition-colors line-clamp-1">
            {product.name}
          </h3>
        </Link>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {product.description}
        </p>
      </div>

      {/* Price */}
      <div className="shrink-0 text-right hidden sm:block">
        <p className="text-[10px] text-muted-foreground uppercase">List price</p>
        <p className="font-mono font-semibold">
          {pricingVisible ? formatCurrency(product.price) : "—"}
        </p>
      </div>

      {/* Org badge */}
      <Badge
        className="shrink-0 font-mono text-[10px] hidden md:flex text-white border-0"
        style={{ backgroundColor: color }}
      >
        {product.sales_org_id}
      </Badge>

      {/* Add + arrow */}
      {canAddToCart && (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 text-xs"
          disabled={isAdding}
          onClick={() => onAddToCart(product)}
        >
          {isAdding ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
        </Button>
      )}

      <Link href={`/products/${product.id}`} className="shrink-0">
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </Link>
    </div>
  );
}
