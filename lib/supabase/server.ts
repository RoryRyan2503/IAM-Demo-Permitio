/**
 * Supabase Server Client
 *
 * Used in Server Components, Route Handlers, and Server Actions.
 * Uses the SERVICE ROLE key — bypasses RLS for server-enforced authorization.
 *
 * Security contract:
 *   - This client is NEVER exposed to the browser
 *   - All queries are preceded by canAccess() authorization checks
 *   - Data filtering (salesOrg, accountId) is applied before returning data
 *
 * Why service role instead of RLS?
 *   In this demo, authorization is centralized in Permit.io, not Postgres RLS.
 *   The service role client lets us build the dynamic WHERE clauses driven
 *   by Permit.io decisions rather than duplicating logic in SQL policies.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

/**
 * Create a new Supabase server client per request.
 * (Do NOT share a singleton across requests — service role is privileged.)
 */
export function getSupabaseServerClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
