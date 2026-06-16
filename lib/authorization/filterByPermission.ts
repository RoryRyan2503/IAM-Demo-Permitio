/**
 * Data-Level Authorization Filters
 *
 * These utilities translate Permit.io authorization decisions into
 * Supabase query constraints.
 *
 * Architectural principle:
 *   "The backend NEVER returns all data and filters client-side."
 *   Instead, we build the WHERE clause from the user's authorization context
 *   BEFORE hitting the database.
 *
 * This is data-level ABAC:
 *   User's allowed salesOrgs → .in('sales_org_id', allowedSalesOrgs) filter
 *   User's selected account  → .eq('account_id', selectedAccountId) filter
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Products filter — by sales org
// ---------------------------------------------------------------------------

/**
 * Apply sales org authorization filter to a products query.
 *
 * If allowedSalesOrgs is empty (user has no org access), adds an impossible
 * condition (1=0 equivalent) so no products are returned — fail secure.
 *
 * @example
 * let query = supabase.from('products').select('*')
 * query = applyProductsFilter(query, ['IA001', 'BA002'])
 * const { data } = await query
 */
export function applyProductsFilter<T>(
  query: T & { in: (column: string, values: string[]) => T },
  allowedSalesOrgs: string[]
): T {
  if (allowedSalesOrgs.length === 0) {
    // Return empty result — user has no sales org access
    // Using a UUID that will never match any real ID
    return query.in("sales_org_id", ["__no_access__"]);
  }
  return query.in("sales_org_id", allowedSalesOrgs);
}

// ---------------------------------------------------------------------------
// Orders filter — by account
// ---------------------------------------------------------------------------

/**
 * Apply account authorization filter to an orders query.
 * Users can only see orders for their currently selected account.
 */
export function applyOrdersFilter<T>(
  query: T & { eq: (column: string, value: string) => T },
  accountId: string
): T {
  return query.eq("account_id", accountId);
}

// ---------------------------------------------------------------------------
// Quotes filter — by account
// ---------------------------------------------------------------------------

/**
 * Apply account authorization filter to a quotes query.
 */
export function applyQuotesFilter<T>(
  query: T & { eq: (column: string, value: string) => T },
  accountId: string
): T {
  return query.eq("account_id", accountId);
}

// ---------------------------------------------------------------------------
// Cart filter — by user + account
// ---------------------------------------------------------------------------

/**
 * Apply user + account filter to a cart query.
 * Cart is fully personal — scoped to the user AND their selected account.
 */
export function applyCartFilter<T extends { eq: (column: string, value: string) => T }>(
  query: T,
  userId: string,
  accountId: string
): T {
  return query.eq("user_id", userId).eq("account_id", accountId);
}

// ---------------------------------------------------------------------------
// Price masking — view_pricing ABAC
// ---------------------------------------------------------------------------

/**
 * Strip pricing information from product data for users without view_pricing permission.
 *
 * Frontend authorization (UX): hide price column
 * Backend authorization (security): return 0 or null for price field
 *
 * Both layers are applied independently.
 */
export function maskProductPricing<T extends { price?: number }>(
  products: T[],
  canViewPricing: boolean
): T[] {
  if (canViewPricing) return products;
  return products.map((p) => ({ ...p, price: 0 }));
}
