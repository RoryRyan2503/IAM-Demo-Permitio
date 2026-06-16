/**
 * Diagnose sales-org ABAC config in Permit.io
 * Usage: node scripts/diagnose-salesorg.mjs
 */
import { Permit } from "permitio";
import { readFileSync } from "fs";

// Parse .env.local
const envContent = readFileSync(".env.local", "utf8");
for (const line of envContent.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i > 0 && !process.env[t.slice(0, i).trim()]) {
    process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
}

const API_KEY = process.env.PERMIT_API_KEY;
const BASE = "https://api.permit.io/v2";
const permit = new Permit({
  token: API_KEY,
  pdp: process.env.PERMIT_PDP_URL ?? "https://cloudpdp.api.permit.io",
  log: { level: "error" },
});

async function api(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
  });
  return res.json();
}

const scope = await api("/api-key/scope");
const proj = scope.project_id, envId = scope.environment_id;
console.log(`Project: ${proj}  Env: ${envId}\n`);

// 1. Show buyer's stored attributes
console.log("=== user-buyer stored attributes ===");
try {
  const u = await api(`/facts/${proj}/${envId}/users/user-buyer`);
  console.log("  roles:", JSON.stringify(u.roles ?? []));
  console.log("  attributes:", JSON.stringify(u.attributes ?? {}));
} catch (e) { console.log("  ERROR:", e.message); }

// 2. Show resource-attribute schema for products
console.log("\n=== products resource attributes (schema) ===");
try {
  const r = await api(`/schema/${proj}/${envId}/resources/products`);
  console.log("  actions:", Object.keys(r.actions ?? {}).join(", "));
  console.log("  attributes:", JSON.stringify(Object.keys(r.attributes ?? {})));
} catch (e) { console.log("  ERROR:", e.message); }

// 3. Show condition sets (user sets + resource sets)
console.log("\n=== condition sets (user sets + resource sets) ===");
try {
  const sets = await api(`/schema/${proj}/${envId}/condition_sets`);
  const list = sets.data ?? sets;
  for (const s of list) {
    console.log(`  - [${s.type}] ${s.key} :: ${JSON.stringify(s.conditions)}`);
  }
} catch (e) { console.log("  ERROR:", e.message); }

// 4. Show condition set RULES (which user set is granted which action on which resource set)
console.log("\n=== condition set rules (grants) ===");
try {
  const rules = await api(`/facts/${proj}/${envId}/condition_set_rules`);
  const list = rules.data ?? rules;
  if (!list.length) console.log("  (none)");
  for (const r of list) {
    console.log(`  - userset=${r.user_set} action=${r.permission} resourceset=${r.resource_set}`);
  }
} catch (e) { console.log("  ERROR:", e.message); }

// 5. Live checks reproducing the app
console.log("\n=== live permit.check() ===");
const buyerAttrs = { allowedSalesOrgs: ["IA001", "BA002"], persona: "procurement" };

async function check(label, action, resourceObj) {
  try {
    const allowed = await permit.check(
      { key: "user-buyer", attributes: buyerAttrs },
      action,
      resourceObj
    );
    console.log(`  ${allowed ? "✅" : "❌"} ${label} => ${allowed}`);
  } catch (e) {
    console.log(`  ⚠️  ${label} => ERROR ${e.message.slice(0, 80)}`);
  }
}

// collection-level: NO sales_org_id pushed (this is what GET /api/products does)
await check("LIST  products (no sales_org_id)", "view", { type: "products", attributes: {} });
// instance-level: allowed org
await check("ITEM  products sales_org_id=IA001 (allowed)", "view", { type: "products", attributes: { sales_org_id: "IA001" } });
// instance-level: disallowed org
await check("ITEM  products sales_org_id=PA001 (NOT allowed)", "view", { type: "products", attributes: { sales_org_id: "PA001" } });

console.log("\nDone.");
