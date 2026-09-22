-- ============================================================================
-- 004_admin_quotes_rls.sql
-- Idempotent, additive migration. Does NOT delete or reset any existing data.
--
-- Adds:
--   1. quotes.valid_until / quote_items.discount_pct — already read/written by
--      app/api/quotes/route.ts and app/(portal)/quotes/page.tsx but never
--      created by a prior migration. Adding them here so the Quotes feature
--      actually works against a fresh database.
--   2. Row Level Security on all app tables.
--
-- RLS notes:
--   - All server-side reads/writes go through lib/supabase/server.ts, which
--     uses the SERVICE ROLE key. The service role BYPASSES RLS entirely, so
--     none of these policies affect the app's own API routes.
--   - The browser (anon key) client in lib/supabase/client.ts is not
--     currently used to query any table directly. Enabling RLS with no
--     permissive policies means that if the anon/authenticated key were ever
--     used or leaked, it can read/write NOTHING — a safe default-deny.
-- ============================================================================

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS valid_until timestamptz;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS discount_pct integer NOT NULL DEFAULT 0;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_sales_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tool_access ENABLE ROW LEVEL SECURITY;

-- No CREATE POLICY statements: with RLS enabled and zero policies, every
-- table default-denies anon/authenticated roles while the service role
-- (used exclusively by our server-side API routes) continues to bypass RLS.
