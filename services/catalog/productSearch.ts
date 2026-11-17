import type { UserContext, AuthSession } from "@/types";
import { searchCoveoProducts, type CoveoProduct } from "@/services/coveo/client";

export interface CatalogSearchOptions {
  session: AuthSession;
  userContext: UserContext;
  query: string;
  userAgent: string;
  referer: string;
}

export interface CatalogSearchResult {
  products: CoveoProduct[];
  total: number;
  sources: string[];
  warnings: string[];
}

export async function searchCatalogProducts(options: CatalogSearchOptions): Promise<CatalogSearchResult> {
  const result = await searchCoveoProducts(options);
  return {
    products: result.products.map((product) => ({ ...product, source: "Coveo" })),
    total: result.total,
    sources: ["Coveo"],
    warnings: [],
  };
}