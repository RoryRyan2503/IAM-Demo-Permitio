/**
 * Supabase Browser Client
 *
 * Used in Client Components for read-only queries.
 * Uses the anon key — subject to Row Level Security (RLS).
 *
 * For the demo, data filtering is done at the API route level using the
 * service role client, so this client is primarily for future RLS-based
 * features.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton pattern — prevents multiple client instances in hot reloads
let browserClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return browserClient;
}
