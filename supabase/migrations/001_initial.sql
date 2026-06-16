-- =============================================================================
-- IAM + FGAC Commerce Demo — Supabase Database Schema
-- =============================================================================
-- Run this in the Supabase SQL Editor:
--   Dashboard → SQL Editor → New Query → paste & run
--
-- Tables:
--   users          - application users (synced from Ping Identity JWT)
--   accounts       - sold-to accounts (customer companies)
--   user_accounts  - many-to-many: which users belong to which accounts
--   sales_orgs     - sales organizations within an account
--   products       - product catalog, scoped to a sales_org
--   orders         - orders placed against an account
--   order_items    - line items within an order
--   quotes         - price quotes (requires procurement persona to create)
--   quote_items    - line items within a quote
--   cart_items     - shopping cart, scoped to user + account
-- =============================================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- =============================================================================
-- USERS
-- =============================================================================
create table if not exists public.users (
  id          text        primary key,               -- matches sub claim from Ping JWT
  email       text        not null unique,
  name        text        not null,
  role        text        not null default 'viewer'   -- admin | buyer | viewer
                          check (role in ('admin', 'buyer', 'viewer')),
  persona     text        not null default 'general'  -- procurement | sales | finance | general
                          check (persona in ('procurement', 'sales', 'finance', 'general')),
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- ACCOUNTS (sold-to accounts)
-- =============================================================================
create table if not exists public.accounts (
  id            text        primary key,              -- e.g. ACC100, ACC200
  account_name  text        not null,
  created_at    timestamptz not null default now()
);

-- =============================================================================
-- USER_ACCOUNTS (many-to-many: users ↔ accounts)
-- =============================================================================
create table if not exists public.user_accounts (
  user_id     text        not null references public.users(id)    on delete cascade,
  account_id  text        not null references public.accounts(id) on delete cascade,
  primary key (user_id, account_id)
);

-- =============================================================================
-- SALES_ORGS (sales organizations within an account)
-- =============================================================================
create table if not exists public.sales_orgs (
  id          text        primary key,               -- e.g. IA001, BA002, PA001
  name        text        not null,
  account_id  text        not null references public.accounts(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- PRODUCTS (scoped to a sales organization)
-- Data-level authorization: users only see products from their allowed sales orgs
-- =============================================================================
create table if not exists public.products (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,
  description   text,
  price         integer     not null default 0,       -- price in USD cents
  sku           text        not null unique,
  sales_org_id  text        not null references public.sales_orgs(id),
  category      text        not null default 'General',
  image_url     text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_products_sales_org_id on public.products(sales_org_id);

-- =============================================================================
-- ORDERS (scoped to an account)
-- Data-level authorization: users only see orders for their selected account
-- =============================================================================
create table if not exists public.orders (
  id          uuid        primary key default gen_random_uuid(),
  account_id  text        not null references public.accounts(id),
  user_id     text        not null references public.users(id),
  status      text        not null default 'pending'
                          check (status in ('pending','confirmed','processing','shipped','delivered','cancelled')),
  total       integer     not null default 0,         -- total in USD cents
  created_at  timestamptz not null default now()
);

create index if not exists idx_orders_account_id on public.orders(account_id);
create index if not exists idx_orders_user_id    on public.orders(user_id);

-- =============================================================================
-- ORDER_ITEMS
-- =============================================================================
create table if not exists public.order_items (
  id            uuid        primary key default gen_random_uuid(),
  order_id      uuid        not null references public.orders(id)   on delete cascade,
  product_id    uuid        not null references public.products(id),
  product_name  text        not null,                -- denormalized for history
  quantity      integer     not null default 1,
  unit_price    integer     not null default 0
);

create index if not exists idx_order_items_order_id on public.order_items(order_id);

-- =============================================================================
-- QUOTES (scoped to an account; requires procurement persona to create)
-- =============================================================================
create table if not exists public.quotes (
  id          uuid        primary key default gen_random_uuid(),
  account_id  text        not null references public.accounts(id),
  user_id     text        not null references public.users(id),
  status      text        not null default 'draft'
                          check (status in ('draft','submitted','approved','rejected','expired')),
  total       integer     not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_quotes_account_id on public.quotes(account_id);

-- =============================================================================
-- QUOTE_ITEMS
-- =============================================================================
create table if not exists public.quote_items (
  id            uuid        primary key default gen_random_uuid(),
  quote_id      uuid        not null references public.quotes(id) on delete cascade,
  product_id    uuid        not null references public.products(id),
  product_name  text        not null,
  quantity      integer     not null default 1,
  unit_price    integer     not null default 0
);

-- =============================================================================
-- CART_ITEMS (scoped to user + account)
-- =============================================================================
create table if not exists public.cart_items (
  id            uuid        primary key default gen_random_uuid(),
  user_id       text        not null references public.users(id)    on delete cascade,
  account_id    text        not null references public.accounts(id) on delete cascade,
  product_id    uuid        not null references public.products(id),
  product_name  text        not null,
  product_sku   text        not null,
  quantity      integer     not null default 1,
  unit_price    integer     not null default 0,
  added_at      timestamptz not null default now(),
  unique (user_id, account_id, product_id)
);

create index if not exists idx_cart_user_account on public.cart_items(user_id, account_id);
