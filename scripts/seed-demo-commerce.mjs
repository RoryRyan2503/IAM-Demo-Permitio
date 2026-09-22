/**
 * Idempotent Demo Data Seed — Orders & Quotes
 *
 * Ensures every existing sold-to account (public.accounts) has at least
 * MIN_ORDERS_PER_ACCOUNT orders and MIN_QUOTES_PER_ACCOUNT quotes, with
 * realistic line items drawn from products already scoped to that
 * account's sales orgs, and referencing a real user associated with the
 * account (via user_accounts).
 *
 * IDEMPOTENT / NON-DESTRUCTIVE:
 *   - Never deletes or updates existing rows.
 *   - Only INSERTs the difference between the current count and the target
 *     minimum for each account, so re-running this script is a no-op once
 *     every account has reached the target.
 *
 * Run: node scripts/seed-demo-commerce.mjs
 * Requires NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const envContent = readFileSync(".env.local", "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const [key, ...vals] = line.split("=");
  if (key && vals.length) envVars[key.trim()] = vals.join("=").trim();
});

const supabaseUrl = envVars["NEXT_PUBLIC_SUPABASE_URL"];
const supabaseKey = envVars["SUPABASE_SERVICE_KEY"];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE env vars in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const MIN_ORDERS_PER_ACCOUNT = 6;
const MIN_QUOTES_PER_ACCOUNT = 3;

const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
const QUOTE_STATUSES = ["draft", "submitted", "approved", "rejected", "expired"];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Pure helper — how many rows to insert to reach `target` from `current`. Exported for idempotency tests. */
export function diffToTarget(target, current) {
  return Math.max(0, target - (current ?? 0));
}

function pick(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

function pickItems(products, maxItems = 3) {
  const count = randomInt(1, Math.min(maxItems, products.length));
  const shuffled = [...products].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Finds orders/quotes for an account that have zero line items (e.g. left
 * behind by a transient network failure between the parent insert and the
 * child insert on a prior run) and inserts one line item so every parent
 * row is complete. Never deletes or modifies existing rows.
 */
async function backfillMissingLineItems({
  parentTable,
  itemsTable,
  parentIdColumn,
  accountId,
  accountProducts,
  withDiscount = false,
}) {
  const { data: parents, error } = await supabase
    .from(parentTable)
    .select(`id, ${itemsTable} (id)`)
    .eq("account_id", accountId);
  if (error) throw error;

  const orphans = (parents ?? []).filter((p) => (p[itemsTable]?.length ?? 0) === 0);
  for (const orphan of orphans) {
    const items = pickItems(accountProducts);
    const lineItems = items.map((p) => ({
      [parentIdColumn]: orphan.id,
      product_id: p.id,
      product_name: p.name,
      quantity: randomInt(1, 5),
      unit_price: p.price,
      ...(withDiscount ? { discount_pct: pick([0, 0, 5, 10, 15]) } : {}),
    }));
    const { error: insertError } = await supabase.from(itemsTable).insert(lineItems);
    if (insertError) {
      console.error(`  ! Failed to backfill ${itemsTable} for ${parentTable} ${orphan.id}:`, insertError.message);
    } else {
      console.log(`  ↻ Backfilled ${lineItems.length} ${itemsTable} for orphaned ${parentTable} ${orphan.id}`);
    }
  }
}

async function main() {
  console.log("Loading accounts, sales orgs, products, and user associations...");

  const { data: accounts, error: accountsError } = await supabase
    .from("accounts")
    .select("id, account_name");
  if (accountsError) throw accountsError;

  const { data: salesAreas, error: salesAreasError } = await supabase
    .from("account_sales_areas")
    .select("account_id, sales_org_id");
  if (salesAreasError) throw salesAreasError;

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, sku, price, sales_org_id");
  if (productsError) throw productsError;

  const { data: userAccounts, error: userAccountsError } = await supabase
    .from("user_accounts")
    .select("user_id, account_id");
  if (userAccountsError) throw userAccountsError;

  const salesOrgsByAccount = new Map();
  for (const sa of salesAreas ?? []) {
    if (!salesOrgsByAccount.has(sa.account_id)) salesOrgsByAccount.set(sa.account_id, new Set());
    salesOrgsByAccount.get(sa.account_id).add(sa.sales_org_id);
  }

  const productsBySalesOrg = new Map();
  for (const p of products ?? []) {
    if (!productsBySalesOrg.has(p.sales_org_id)) productsBySalesOrg.set(p.sales_org_id, []);
    productsBySalesOrg.get(p.sales_org_id).push(p);
  }

  const usersByAccount = new Map();
  for (const ua of userAccounts ?? []) {
    if (!usersByAccount.has(ua.account_id)) usersByAccount.set(ua.account_id, []);
    usersByAccount.get(ua.account_id).push(ua.user_id);
  }

  let ordersCreated = 0;
  let quotesCreated = 0;

  for (const account of accounts ?? []) {
    const salesOrgIds = [...(salesOrgsByAccount.get(account.id) ?? [])];
    const accountProducts = salesOrgIds.flatMap((id) => productsBySalesOrg.get(id) ?? []);
    const accountUsers = usersByAccount.get(account.id) ?? [];

    if (accountProducts.length === 0) {
      console.warn(`  ! Skipping ${account.account_name} (${account.id}) — no products in its sales orgs`);
      continue;
    }
    if (accountUsers.length === 0) {
      console.warn(`  ! Skipping ${account.account_name} (${account.id}) — no users associated`);
      continue;
    }

    // ---- Repair orphans (rows left over from a prior run interrupted mid-insert) ----
    await backfillMissingLineItems({
      parentTable: "orders",
      itemsTable: "order_items",
      parentIdColumn: "order_id",
      accountId: account.id,
      accountProducts,
    });
    await backfillMissingLineItems({
      parentTable: "quotes",
      itemsTable: "quote_items",
      parentIdColumn: "quote_id",
      accountId: account.id,
      accountProducts,
      withDiscount: true,
    });

    // ---- Orders ----
    const { count: orderCount, error: orderCountError } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("account_id", account.id);
    if (orderCountError) throw orderCountError;

    const ordersToCreate = diffToTarget(MIN_ORDERS_PER_ACCOUNT, orderCount);
    for (let i = 0; i < ordersToCreate; i++) {
      const items = pickItems(accountProducts);
      const lineItems = items.map((p) => ({
        product_id: p.id,
        product_name: p.name,
        quantity: randomInt(1, 5),
        unit_price: p.price,
      }));
      const total = lineItems.reduce((sum, li) => sum + li.unit_price * li.quantity, 0);

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          account_id: account.id,
          user_id: pick(accountUsers),
          status: pick(ORDER_STATUSES),
          total,
        })
        .select("id")
        .single();
      if (orderError || !order) {
        console.error(`  ! Failed to create order for ${account.id}:`, orderError?.message);
        continue;
      }

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(lineItems.map((li) => ({ ...li, order_id: order.id })));
      if (itemsError) {
        console.error(`  ! Failed to create order_items for order ${order.id}:`, itemsError.message);
        continue;
      }
      ordersCreated++;
    }

    // ---- Quotes ----
    const { count: quoteCount, error: quoteCountError } = await supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("account_id", account.id);
    if (quoteCountError) throw quoteCountError;

    const quotesToCreate = diffToTarget(MIN_QUOTES_PER_ACCOUNT, quoteCount);
    for (let i = 0; i < quotesToCreate; i++) {
      const items = pickItems(accountProducts);
      const discounts = items.map(() => pick([0, 0, 5, 10, 15]));
      const lineItems = items.map((p, idx) => ({
        product_id: p.id,
        product_name: p.name,
        quantity: randomInt(1, 5),
        unit_price: p.price,
        discount_pct: discounts[idx],
      }));
      const total = lineItems.reduce(
        (sum, li) => sum + li.unit_price * li.quantity * (1 - li.discount_pct / 100),
        0
      );
      const validUntil = new Date(Date.now() + randomInt(7, 90) * 24 * 60 * 60 * 1000).toISOString();

      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          account_id: account.id,
          user_id: pick(accountUsers),
          status: pick(QUOTE_STATUSES),
          total: Math.round(total),
          valid_until: validUntil,
        })
        .select("id")
        .single();
      if (quoteError || !quote) {
        console.error(`  ! Failed to create quote for ${account.id}:`, quoteError?.message);
        continue;
      }

      const { error: itemsError } = await supabase
        .from("quote_items")
        .insert(lineItems.map((li) => ({ ...li, quote_id: quote.id })));
      if (itemsError) {
        console.error(`  ! Failed to create quote_items for quote ${quote.id}:`, itemsError.message);
        continue;
      }
      quotesCreated++;
    }

    console.log(
      `  ✓ ${account.account_name} (${account.id}): +${ordersToCreate} orders, +${quotesToCreate} quotes`
    );
  }

  console.log(`\nDone. Created ${ordersCreated} orders and ${quotesCreated} quotes across ${accounts?.length ?? 0} accounts.`);
  console.log("Re-run this script any time — it only fills in the gap up to the minimum per account.");
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/seed-demo-commerce.mjs")) {
  main().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
}
