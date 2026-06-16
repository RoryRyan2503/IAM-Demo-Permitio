/**
 * Fix-all v2 — corrects the Permit.io misconfiguration that caused "Access Denied".
 *
 * Root cause: products:view / view_pricing were moved off the roles onto the
 * sales_org_scoping resource set. Collection checks (GET /api/products) send no
 * sales_org_id, so the resource-set condition can never match → DENY for everyone.
 *
 * Correct model:
 *   - RBAC roles grant products:view / view_pricing UNCONDITIONALLY (collection gate)
 *   - Per-record sales-org scoping is enforced at the DATA layer:
 *       * list  → Supabase .in("sales_org_id", allowedSalesOrgs)
 *       * item  → explicit check in app/api/products/[id]/route.ts
 *   - ABAC in Permit is used where it works alongside RBAC: quotes:create gated by persona
 *
 * Usage: node scripts/fix-permit-abac.mjs
 */
import { readFileSync } from "fs";

const envContent = readFileSync(".env.local", "utf8");
for (const line of envContent.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i > 0 && !process.env[t.slice(0, i).trim()]) process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}
const API_KEY = process.env.PERMIT_API_KEY;
const BASE = "https://api.permit.io/v2";

async function api(path, method = "GET", body = null) {
  const opts = { method, headers: { Authorization: "Bearer " + API_KEY, "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, body: json };
}

const scope = (await api("/api-key/scope")).body;
const proj = scope.project_id, envId = scope.environment_id;
const schema = `/schema/${proj}/${envId}`;
const facts = `/facts/${proj}/${envId}`;
console.log(`Project ${proj}  Env ${envId}\n`);

// ─── 1. Define user attributes (so pushed attrs + persona userset are valid) ──
console.log("1. Ensuring user attributes exist...");
for (const a of [
  { key: "allowedSalesOrgs", type: "array" },
  { key: "selectedAccountId", type: "string" },
  { key: "persona", type: "string" },
]) {
  const r = await api(`${schema}/resources/__user/attributes`, "POST", a);
  if (r.status < 300) console.log(`   ✅ ${a.key}:${a.type}`);
  else if (JSON.stringify(r.body).includes("already") || r.status === 409) console.log(`   ⏭️  ${a.key} (exists)`);
  else console.log(`   ❌ ${a.key} → ${r.status} ${JSON.stringify(r.body).slice(0, 160)}`);
}

// ─── 2. Restore UNCONDITIONAL role grants ────────────────────────────────────
console.log("\n2. Restoring role permissions (plain RBAC grants)...");
const rolePerms = {
  Admin: [
    "products:view", "products:view_pricing", "products:create", "products:update", "products:delete",
    "orders:view", "orders:create", "orders:update", "orders:delete",
    "quotes:view", "quotes:create", "quotes:update", "quotes:delete",
    "cart:view", "cart:create", "cart:delete",
    "admin_dashboard:view", "users:manage",
  ],
  Buyer: [
    "products:view", "products:view_pricing",
    "orders:view", "orders:create",
    "quotes:view",
    "cart:view", "cart:create", "cart:delete",
  ],
  Viewer: ["products:view", "orders:view"],
};
for (const [key, permissions] of Object.entries(rolePerms)) {
  const r = await api(`${schema}/roles/${key}`, "PATCH", { permissions });
  console.log(`   ${r.status < 300 ? "✅" : "❌"} ${key} (${permissions.length} perms, status ${r.status})`);
  if (r.status >= 300) console.log("      ", JSON.stringify(r.body).slice(0, 200));
}

// ─── 3. Fix quote_creation user set → user.persona ───────────────────────────
console.log("\n3. Fixing quote_creation user set (persona)...");
{
  const conditions = { allOf: [ { allOf: [ { "user.persona": { equals: "procurement" } } ] } ] };
  const r = await api(`${schema}/condition_sets/quote_creation`, "PATCH", { conditions });
  console.log(`   ${r.status < 300 ? "✅" : "❌"} quote_creation (status ${r.status})`);
  if (r.status >= 300) console.log("      ", JSON.stringify(r.body).slice(0, 200));
}

// ─── 4. Remove broken autogen product resource-set rules ─────────────────────
console.log("\n4. Removing autogen product resource-set grants (they break collection checks)...");
for (const permission of ["products:view", "products:view_pricing"]) {
  const rule = { user_set: "__autogen_Admin", permission, resource_set: "sales_org_scoping" };
  const r = await api(`${facts}/set_rules`, "DELETE", rule);
  if (r.status < 300) console.log(`   ✅ removed ${permission} on sales_org_scoping`);
  else console.log(`   ⏭️  ${permission} (status ${r.status})`);
}

// ─── 5. Final state ──────────────────────────────────────────────────────────
console.log("\n=== Final roles ===");
{
  const roles = (await api(`${schema}/roles`)).body;
  for (const r of (roles.data ?? roles)) {
    const hasView = (r.permissions || []).includes("products:view");
    console.log(`  ${r.key}: products:view=${hasView}  (${(r.permissions || []).length} perms)`);
  }
}
console.log("\n=== Final set rules ===");
{
  const r = await api(`${facts}/set_rules`);
  const list = r.body?.data ?? r.body ?? [];
  if (!Array.isArray(list) || !list.length) console.log("  (none)");
  else for (const x of list) console.log(`  ${x.user_set} → ${x.permission} on ${x.resource_set}`);
}

console.log("\nDone. Run: node scripts/verify-permit-abac.mjs");
