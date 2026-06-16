-- ============================================================================
-- 003_crm_tables.sql — Extend DB to serve as CRM data source
-- Run in Supabase Dashboard > SQL Editor
-- ============================================================================
-- Existing IDs in DB:
--   Users:    user-admin, user-buyer, user-viewer
--   Accounts: 001ACC001 (Honeywell), 001ACC002 (Whole Foods), 001ACC003 (GreenTech)
--   Sales orgs: 4050, 8421, 1492, PT01, PT02, 7332, 7511, BA01, BA02, 1001, IA01, IA02
-- ============================================================================

-- 1. ACCOUNTS — add CRM-like columns
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS account_number text;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS erp_number text;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'Customer';
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS line_of_business text[] DEFAULT '{}';

-- 2. USERS — add profile + CRM-like columns
--    (includes columns from 002_user_profile_fields.sql in case it was not run)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS hon_id text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_super_user boolean DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS user_type text DEFAULT 'Customer';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS contact_id text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS active_sales_area text;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_persona_check;
ALTER TABLE public.users ADD CONSTRAINT users_persona_check
  CHECK (persona IN ('procurement','sales','finance','general','GBE'));

-- 3. ACCOUNT_SALES_AREAS junction
CREATE TABLE IF NOT EXISTS public.account_sales_areas (
  account_id   text NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  sales_org_id text NOT NULL REFERENCES public.sales_orgs(id) ON DELETE CASCADE,
  currency              text NOT NULL DEFAULT 'USD',
  distribution_channel  text NOT NULL DEFAULT '10',
  division              text NOT NULL DEFAULT 'A',
  sales_area            text NOT NULL,
  PRIMARY KEY (account_id, sales_org_id)
);

-- 4. USER_TOOL_ACCESS
CREATE TABLE IF NOT EXISTS public.user_tool_access (
  id              text PRIMARY KEY,
  user_id         text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  master_tool_id  text NOT NULL,
  tool_name       text NOT NULL,
  status          text NOT NULL DEFAULT 'Approved',
  requested_date  timestamptz NOT NULL DEFAULT now(),
  granted_date    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- 5. Add missing accounts (Tesla, Siemens)
INSERT INTO public.accounts (id, account_name) VALUES
  ('001ACC004', 'Tesla Energy'),
  ('001ACC005', 'Siemens AG')
ON CONFLICT (id) DO UPDATE SET account_name = EXCLUDED.account_name;

-- 6. Add missing sales orgs (PA01, PA02, PT03)
INSERT INTO public.sales_orgs (id, name, account_id) VALUES
  ('PA01', 'Process Automation – US',      '001ACC002'),
  ('PA02', 'Process Automation – EU',      '001ACC002'),
  ('PT03', 'Process Technology – UK',      '001ACC004')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 7. Update accounts with CRM fields
UPDATE public.accounts SET
  account_number = '4098086', erp_number = 'S4H100',
  account_type = 'Distributor', line_of_business = ARRAY['Building Automation','Process Technology']
WHERE id = '001ACC001';

UPDATE public.accounts SET
  account_number = '2810713', erp_number = 'S4H100',
  account_type = 'Partner', line_of_business = ARRAY['Building Automation','Process Automation']
WHERE id = '001ACC002';

UPDATE public.accounts SET
  account_number = '3920187', erp_number = 'S4H200',
  account_type = 'Customer', line_of_business = ARRAY['Industrial Automation']
WHERE id = '001ACC003';

UPDATE public.accounts SET
  account_number = '5501298', erp_number = 'S4H300',
  account_type = 'Partner', line_of_business = ARRAY['Process Technology','Industrial Automation']
WHERE id = '001ACC004';

UPDATE public.accounts SET
  account_number = '6702411', erp_number = 'S4H400',
  account_type = 'Distributor', line_of_business = ARRAY['Process Automation','Process Technology']
WHERE id = '001ACC005';

-- 8. Update users with CRM fields + profile data
UPDATE public.users SET
  phone = '+1 (602) 555-0147', hon_id = 'h125001', department = 'IT Administration',
  is_super_user = false, user_type = 'Partner',
  contact_id = '003CT0001', active_sales_area = 'BA01_10',
  persona = 'GBE'
WHERE id = 'user-admin';

UPDATE public.users SET
  phone = '+1 (312) 555-0234', hon_id = 'h125002', department = 'Procurement',
  is_super_user = false, user_type = 'Partner',
  contact_id = '003CT0002', active_sales_area = 'PA01_10',
  persona = 'GBE'
WHERE id = 'user-buyer';

UPDATE public.users SET
  phone = '+1 (415) 555-0389', hon_id = 'h125003', department = 'Operations',
  is_super_user = false, user_type = 'Customer',
  contact_id = '003CT0003', active_sales_area = 'IA01_10',
  persona = 'general'
WHERE id = 'user-viewer';

-- 9. Seed user_accounts (admin→5, buyer→2, viewer→1)
INSERT INTO public.user_accounts (user_id, account_id) VALUES
  ('user-admin', '001ACC001'),
  ('user-admin', '001ACC002'),
  ('user-admin', '001ACC003'),
  ('user-admin', '001ACC004'),
  ('user-admin', '001ACC005'),
  ('user-buyer', '001ACC002'),
  ('user-buyer', '001ACC004'),
  ('user-viewer', '001ACC003')
ON CONFLICT DO NOTHING;

-- 10. Seed account_sales_areas
--     Matches mockData sales org assignments per account
INSERT INTO public.account_sales_areas (account_id, sales_org_id, currency, distribution_channel, division, sales_area)
VALUES
  -- 001ACC001 (Honeywell): BA01, BA02, PT01, PT02
  ('001ACC001', 'BA01', 'USD', '10', 'B', 'BA01_10'),
  ('001ACC001', 'BA02', 'EUR', '20', 'B', 'BA02_20'),
  ('001ACC001', 'PT01', 'USD', '10', 'P', 'PT01_10'),
  ('001ACC001', 'PT02', 'EUR', '20', 'P', 'PT02_20'),
  -- 001ACC002 (Whole Foods): BA01, PA01, PA02
  ('001ACC002', 'BA01', 'USD', '10', 'B', 'BA01_10'),
  ('001ACC002', 'PA01', 'USD', '10', 'A', 'PA01_10'),
  ('001ACC002', 'PA02', 'EUR', '20', 'A', 'PA02_20'),
  -- 001ACC003 (GreenTech): IA01, IA02
  ('001ACC003', 'IA01', 'USD', '10', 'I', 'IA01_10'),
  ('001ACC003', 'IA02', 'EUR', '20', 'I', 'IA02_20'),
  -- 001ACC004 (Tesla): PT01, PT03, IA01
  ('001ACC004', 'PT01', 'USD', '10', 'P', 'PT01_10'),
  ('001ACC004', 'PT03', 'GBP', '30', 'P', 'PT03_30'),
  ('001ACC004', 'IA01', 'USD', '10', 'I', 'IA01_10'),
  -- 001ACC005 (Siemens): PA01, PA02, PT02, PT03
  ('001ACC005', 'PA01', 'USD', '10', 'A', 'PA01_10'),
  ('001ACC005', 'PA02', 'EUR', '20', 'A', 'PA02_20'),
  ('001ACC005', 'PT02', 'EUR', '20', 'P', 'PT02_20'),
  ('001ACC005', 'PT03', 'GBP', '30', 'P', 'PT03_30')
ON CONFLICT DO NOTHING;

-- 11. Seed user_tool_access (matches mockData tool grants)
INSERT INTO public.user_tool_access (id, user_id, master_tool_id, tool_name, status)
VALUES
  -- admin: TL003, TL001, TL004, TL009
  ('CTA-003CT0001-TL003', 'user-admin', 'TL003', 'Order Status',     'Approved'),
  ('CTA-003CT0001-TL001', 'user-admin', 'TL001', 'e-Commerce',       'Approved'),
  ('CTA-003CT0001-TL004', 'user-admin', 'TL004', 'Customer Support', 'Approved'),
  ('CTA-003CT0001-TL009', 'user-admin', 'TL009', 'My Invoices',      'Approved'),
  -- buyer: TL003, TL004
  ('CTA-003CT0002-TL003', 'user-buyer', 'TL003', 'Order Status',     'Approved'),
  ('CTA-003CT0002-TL004', 'user-buyer', 'TL004', 'Customer Support', 'Approved'),
  -- viewer: TL004, TL009
  ('CTA-003CT0003-TL004', 'user-viewer', 'TL004', 'Customer Support', 'Approved'),
  ('CTA-003CT0003-TL009', 'user-viewer', 'TL009', 'My Invoices',      'Approved')
ON CONFLICT (id) DO NOTHING;
