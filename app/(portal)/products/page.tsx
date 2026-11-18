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
import { ProductImage } from "@/components/products/ProductImage";
import type { CoveoProduct as ApiProduct } from "@/services/coveo/client";
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
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Product shape normalized by the Coveo API route                     */
/* ------------------------------------------------------------------ */
export default function ProductsPage() {
  return (
    <PermissionGate action="view" resource="products" fallback={<AccessDenied />}>
      <ProductsContent />
    </PermissionGate>
  );
}

function ProductsContent() {
  const { selectedAccount, selectedCurrency } = useAccountContext();
  const { hasPermission } = useAuth();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [productsTotal, setProductsTotal] = useState(0);
  const [dataSources, setDataSources] = useState<string[]>([]);
  const [sourceWarnings, setSourceWarnings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pricingVisible, setPricingVisible] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  /* View & search state */
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [sortOrder, setSortOrder] = useState("relevance");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [selectedOrgs, setSelectedOrgs] = useState<Set<string>>(new Set());
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set());
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const canAddToCart = hasPermission("create", "cart");

  /* ---------------------------------------------------------------- */
  /* Fetch products                                                    */
  /* ---------------------------------------------------------------- */
  const selectedAccountId = selectedAccount?.accountId;

  useEffect(() => {
    if (!selectedAccountId) {
      setProducts([]);
      setProductsTotal(0);
      setError(null);
      setDataSources([]);
      setSourceWarnings([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set("q", searchQuery.trim());
        const queryString = params.toString();
        const res = await fetch(`/api/products${queryString ? `?${queryString}` : ""}`, {
          headers: {
            "x-account-id": selectedAccountId,
            "x-selected-currency": selectedCurrency,
          },
          signal: controller.signal,
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Failed to load products");
          setProducts([]);
          return;
        }
        const data = await res.json();
        setProducts(data.data ?? []);
        setProductsTotal(data.meta?.total ?? data.data?.length ?? 0);
        setDataSources(data.meta?.sources ?? []);
        setSourceWarnings(data.meta?.warnings ?? []);
        setPricingVisible(data.meta?.pricingVisible ?? true);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        setError("Network error — could not load products");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [selectedAccountId, selectedCurrency, searchQuery]);

  /* ---------------------------------------------------------------- */
  /* Derived filter options                                            */
  /* ---------------------------------------------------------------- */
  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort(),
    [products]
  );
  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand).filter(Boolean))).sort(),
    [products]
  );
  const orgs = useMemo(
    () => Array.from(new Set(products.map((p) => p.sales_org_id))).sort(),
    [products]
  );
  const domains = useMemo(
    () => Array.from(new Set(products.map((p) => p.domain).filter((value): value is string => Boolean(value)))).sort(),
    [products]
  );
  const countries = useMemo(
    () => Array.from(new Set(products.map((p) => p.country).filter((value): value is string => Boolean(value)))).sort(),
    [products]
  );

  /* ---------------------------------------------------------------- */
  /* Filtered products                                                 */
  /* ---------------------------------------------------------------- */
  const filtered = useMemo(() => {
    let result = products;
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter((product) => [
        product.name, product.sku, product.productId, product.category,
        product.description, product.domain, product.country, product.brand, product.familyName,
      ].some((value) => value.toLowerCase().includes(query)));
    }
    if (selectedCategories.size > 0)
      result = result.filter((p) => selectedCategories.has(p.category));
    if (selectedBrands.size > 0)
      result = result.filter((p) => selectedBrands.has(p.brand));
    if (selectedOrgs.size > 0)
      result = result.filter((p) => selectedOrgs.has(p.sales_org_id));
    if (selectedDomains.size > 0)
      result = result.filter((p) => p.domain && selectedDomains.has(p.domain));
    if (selectedCountries.size > 0)
      result = result.filter((p) => p.country && selectedCountries.has(p.country));
    result = [...result];
    if (sortOrder === "name") result.sort((a, b) => a.name.localeCompare(b.name));
    if (sortOrder === "sku") result.sort((a, b) => a.sku.localeCompare(b.sku));
    return result;
  }, [products, searchQuery, selectedCategories, selectedBrands, selectedOrgs, selectedDomains, selectedCountries, sortOrder]);

  const activeFilterCount =
    selectedCategories.size + selectedBrands.size + selectedOrgs.size +
    selectedDomains.size + selectedCountries.size;

  const clearAllFilters = () => {
    setSelectedCategories(new Set());
    setSelectedBrands(new Set());
    setSelectedOrgs(new Set());
    setSelectedDomains(new Set());
    setSelectedCountries(new Set());
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
          body: JSON.stringify({ productId: product.id, sku: product.sku, quantity: 1 }),
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

      {brands.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Brand
          </h4>
          <div className="space-y-2">
            {brands.map((brand) => (
              <label key={brand} className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox
                  checked={selectedBrands.has(brand)}
                  onCheckedChange={() => toggleFilter(selectedBrands, setSelectedBrands, brand)}
                />
                <span>{brand}</span>
              </label>
            ))}
          </div>
        </div>
      )}

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

      {domains.length > 0 && (
        <>
          <Separator />
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Domain
            </h4>
            <div className="space-y-2">
              {domains.map((domain) => (
                <label key={domain} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={selectedDomains.has(domain)}
                    onCheckedChange={() => toggleFilter(selectedDomains, setSelectedDomains, domain)}
                  />
                  <span>{domain}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}

      {countries.length > 0 && (
        <>
          <Separator />
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Country
            </h4>
            <div className="space-y-2">
              {countries.map((country) => (
                <label key={country} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={selectedCountries.has(country)}
                    onCheckedChange={() => toggleFilter(selectedCountries, setSelectedCountries, country)}
                  />
                  <span>{country}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  /* ================================================================ */
  /* RENDER                                                            */
  /* ================================================================ */
  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="pb-4 border-b border-border">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Products
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Browse products available for your selected Sold-To account
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {dataSources.map((source) => (
              <Badge key={source} variant="outline" className="text-[10px]">{source}</Badge>
            ))}
            {selectedAccount && (
              <Badge variant="secondary" className="font-mono text-[11px]">
                {selectedAccount.accountName}
              </Badge>
            )}
            <Badge variant="outline" className="font-mono text-[11px]">
              {selectedCurrency}
            </Badge>
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

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}
      {sourceWarnings.length > 0 && (
        <p className="text-xs text-amber-700" role="status">{sourceWarnings.join(" ")}</p>
      )}

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              aria-label="Search products"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8"
            />
            {searchQuery && (
              <button
                aria-label="Clear product search"
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
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
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
              aria-label="List view"
              aria-pressed={viewMode === "list"}
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
          <select
            aria-label="Sort products"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
          >
            <option value="relevance">Relevance</option>
            <option value="name">Name</option>
            <option value="sku">SKU</option>
          </select>
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
            {Array.from(selectedBrands).map((t) => (
              <Badge key={t} variant="secondary" className="gap-1 pr-1">
                {t}
                <button
                  onClick={() => toggleFilter(selectedBrands, setSelectedBrands, t)}
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
            {Array.from(selectedDomains).map((domain) => (
              <Badge key={domain} variant="secondary" className="gap-1 pr-1">
                {domain}
                <button onClick={() => toggleFilter(selectedDomains, setSelectedDomains, domain)} className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {Array.from(selectedCountries).map((country) => (
              <Badge key={country} variant="secondary" className="gap-1 pr-1">
                {country}
                <button onClick={() => toggleFilter(selectedCountries, setSelectedCountries, country)} className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5">
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
              Showing {filtered.length} of {products.length} loaded products
              {productsTotal > products.length && ` (${productsTotal.toLocaleString()} search matches)`}
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
  const isAdding = addingToCart === product.id;

  return (
    <div className="group rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all flex flex-col">
      <Link href={`/products/${encodeURIComponent(product.sku || product.id)}`} className="p-4 pb-0">
        <ProductImage src={product.image_url} name={product.name} className="h-48 w-full" />
      </Link>

      {/* Content */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {product.brand && <Badge variant="secondary" className="text-[10px]">{product.brand}</Badge>}
            {product.category && <span className="text-[11px] text-muted-foreground">{product.category}</span>}
          </div>
          <Link href={`/products/${encodeURIComponent(product.sku || product.id)}`}>
            <h3 className="text-base font-semibold break-words group-hover:text-primary transition-colors line-clamp-2">
              {product.name}
            </h3>
          </Link>
          {product.sku && product.sku !== product.name && <p className="mt-1 break-all font-mono text-xs text-muted-foreground">SKU {product.sku}</p>}
          {product.familyName && product.familyName !== product.name && (
            <p className="text-xs font-medium mt-1 line-clamp-2">{product.familyName}</p>
          )}
          {product.description && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
              {product.description}
            </p>
          )}
        </div>

        <div className="border-t border-border/50 mt-auto pt-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">List price · {product.currency}</p>
          <span className={cn("font-semibold", pricingVisible && product.price !== null ? "font-mono text-lg" : "text-sm text-muted-foreground")}>
            {pricingVisible ? (
              product.price !== null ? formatCurrency(product.price, product.currency) : "Price unavailable"
            ) : (
              <span className="text-sm text-muted-foreground">Price hidden</span>
            )}
          </span>
        </div>

        <div className="flex gap-2">
          <Link href={`/products/${encodeURIComponent(product.sku || product.id)}`} className="flex-1">
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
  const isAdding = addingToCart === product.id;

  return (
    <div className="group grid grid-cols-[80px_minmax(0,1fr)] gap-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all p-4 lg:grid-cols-[104px_minmax(0,1fr)_160px]">
      <Link href={`/products/${encodeURIComponent(product.sku || product.id)}`} className="self-start">
        <ProductImage src={product.image_url} name={product.name} className="h-20 w-20 lg:h-24 lg:w-[104px]" />
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          {product.brand && <Badge variant="secondary" className="text-[10px]">{product.brand}</Badge>}
          {product.category && <span className="text-[11px] text-muted-foreground">{product.category}</span>}
        </div>
        <Link href={`/products/${encodeURIComponent(product.sku || product.id)}`}>
          <h3 className="text-base font-semibold break-words group-hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        {product.sku && product.sku !== product.name && <p className="mt-1 break-all font-mono text-xs text-muted-foreground">SKU {product.sku}</p>}
        {product.familyName && product.familyName !== product.name && (
          <p className="text-xs font-medium mt-1">{product.familyName}</p>
        )}
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
          {product.description}
        </p>
      </div>

      <div className="col-span-2 flex items-center justify-between gap-3 border-t border-border/50 pt-3 lg:col-span-1 lg:flex-col lg:items-end lg:justify-center lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
        <div className="lg:text-right">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">List price · {product.currency}</p>
          <p className={cn("font-semibold", pricingVisible && product.price !== null ? "font-mono" : "text-xs text-muted-foreground")}>
            {pricingVisible && product.price !== null
              ? formatCurrency(product.price, product.currency)
              : pricingVisible ? "Price unavailable" : "Price hidden"}
          </p>
        </div>

        <div className="flex items-center gap-2">
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

          <Link href={`/products/${encodeURIComponent(product.sku || product.id)}`} className="shrink-0">
            <Button variant="ghost" size="sm" className="text-xs">
              Details <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
