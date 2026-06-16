/**
 * Provision Permit.io environment — creates resources, roles, users, and role assignments.
 * Usage: node scripts/setup-permit.mjs
 */

import { readFileSync } from "fs";

// Parse .env.local
const envContent = readFileSync(".env.local", "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx > 0) env[trimmed.substring(0, eqIdx).trim()] = trimmed.substring(eqIdx + 1).trim();
}

const API_KEY = env.PERMIT_API_KEY;
const BASE = "https://api.permit.io/v2";

// Get scope
const scope = await apiFetch("/api-key/scope");
const { project_id, environment_id } = scope;
const schemaBase = `${BASE}/schema/${project_id}/${environment_id}`;
const factsBase = `${BASE}/facts/${project_id}/${environment_id}`;

console.log(`Project: ${project_id}`);
console.log(`Environment: ${environment_id}\n`);

// ─── 1. Create Resources ─────────────────────────────────────────────────────
const resources = [
  { key: "products", name: "Products", actions: { view: {}, view_pricing: {}, create: {}, update: {}, delete: {} } },
  { key: "orders", name: "Orders", actions: { view: {}, create: {}, update: {}, delete: {} } },
  { key: "quotes", name: "Quotes", actions: { view: {}, create: {}, update: {}, delete: {} } },
  { key: "cart", name: "Cart", actions: { view: {}, create: {}, delete: {} } },
  { key: "admin_dashboard", name: "Admin Dashboard", actions: { view: {} } },
  { key: "users", name: "Users", actions: { manage: {} } },
];

console.log("Creating resources...");
for (const r of resources) {
  const result = await apiFetch(`/schema/${project_id}/${environment_id}/resources`, "POST", r);
  if (result.key) {
    console.log(`  ✅ ${r.key}`);
  } else if (result.detail?.includes("already exists")) {
    console.log(`  ⏭️  ${r.key} (already exists)`);
  } else {
    console.log(`  ❌ ${r.key}: ${JSON.stringify(result)}`);
  }
}

// ─── 2. Create Roles ─────────────────────────────────────────────────────────
const roles = [
  {
    key: "admin", name: "Admin", description: "Full access",
    permissions: [
      "products:view", "products:view_pricing", "products:create", "products:update", "products:delete",
      "orders:view", "orders:create", "orders:update", "orders:delete",
      "quotes:view", "quotes:create", "quotes:update", "quotes:delete",
      "cart:view", "cart:create", "cart:delete",
      "admin_dashboard:view", "users:manage",
    ],
  },
  {
    key: "buyer", name: "Buyer", description: "Can browse, order, manage cart",
    permissions: [
      "products:view", "products:view_pricing",
      "orders:view", "orders:create",
      "quotes:view",
      "cart:view", "cart:create", "cart:delete",
    ],
  },
  {
    key: "viewer", name: "Viewer", description: "Read-only",
    permissions: [
      "products:view",
      "orders:view",
    ],
  },
];

console.log("\nCreating roles...");
for (const r of roles) {
  const result = await apiFetch(`/schema/${project_id}/${environment_id}/roles`, "POST", r);
  if (result.key) {
    console.log(`  ✅ ${r.key} (${r.permissions.length} permissions)`);
  } else if (result.detail?.includes("already exists")) {
    console.log(`  ⏭️  ${r.key} (already exists)`);
  } else {
    console.log(`  ❌ ${r.key}: ${JSON.stringify(result)}`);
  }
}

// ─── 3. Create Users ─────────────────────────────────────────────────────────
const users = [
  { key: "user-admin", email: "admin@demo.com", first_name: "Miguel", last_name: "Patel" },
  { key: "user-buyer", email: "buyer@demo.com", first_name: "Carlos", last_name: "Johnson" },
  { key: "user-viewer", email: "viewer@demo.com", first_name: "Sarah", last_name: "Chen" },
];

console.log("\nCreating users...");
for (const u of users) {
  const result = await apiFetch(`/facts/${project_id}/${environment_id}/users`, "POST", u);
  if (result.key || result.id) {
    console.log(`  ✅ ${u.key} (${u.email})`);
  } else if (result.detail?.includes("already exists")) {
    console.log(`  ⏭️  ${u.key} (already exists)`);
  } else {
    console.log(`  ❌ ${u.key}: ${JSON.stringify(result)}`);
  }
}

// ─── 4. Assign Roles to Users ────────────────────────────────────────────────
const assignments = [
  { user: "user-admin", role: "admin", tenant: "default" },
  { user: "user-buyer", role: "buyer", tenant: "default" },
  { user: "user-viewer", role: "viewer", tenant: "default" },
];

console.log("\nAssigning roles...");
for (const a of assignments) {
  const result = await apiFetch(
    `/facts/${project_id}/${environment_id}/users/${a.user}/roles`,
    "POST",
    { role: a.role, tenant: a.tenant }
  );
  if (result.role_id || result.role || result.user_id) {
    console.log(`  ✅ ${a.user} → ${a.role} (tenant: ${a.tenant})`);
  } else if (result.detail?.includes("already exists")) {
    console.log(`  ⏭️  ${a.user} → ${a.role} (already assigned)`);
  } else {
    console.log(`  ❌ ${a.user} → ${a.role}: ${JSON.stringify(result)}`);
  }
}

// ─── 5. Verify ───────────────────────────────────────────────────────────────
console.log("\n=== Verification ===");
const { Permit } = await import("permitio");
const permit = new Permit({ token: API_KEY, pdp: env.PERMIT_PDP_URL || "https://cloudpdp.api.permit.io", log: { level: "error" } });

// Wait a moment for PDP to sync policies
console.log("Waiting 3s for PDP policy sync...");
await new Promise(r => setTimeout(r, 3000));

const checks = [
  ["user-admin", "view", "products"],
  ["user-admin", "view", "admin_dashboard"],
  ["user-buyer", "view", "products"],
  ["user-buyer", "view", "admin_dashboard"],
  ["user-viewer", "view", "products"],
  ["user-viewer", "view", "orders"],
  ["user-viewer", "view", "quotes"],
];

for (const [user, action, resource] of checks) {
  try {
    const allowed = await permit.check(user, action, resource);
    console.log(`  ${allowed ? "✅" : "❌"} ${user} | ${action}:${resource} => ${allowed}`);
  } catch (err) {
    console.log(`  ⚠️  ${user} | ${action}:${resource} => ERROR: ${err.message.substring(0, 60)}`);
  }
}

console.log("\n✅ Setup complete!");

// ─── Helper ──────────────────────────────────────────────────────────────────
async function apiFetch(path, method = "GET", body = null) {
  const url = path.startsWith("/") ? `${BASE}${path}` : path;
  const opts = {
    method,
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  return res.json();
}
