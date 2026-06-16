/**
 * Quick Permit.io diagnostic — checks what's configured and what works
 * Usage: node scripts/test-permit.mjs
 */

import { Permit } from "permitio";
import { readFileSync } from "fs";

// Parse .env.local manually (no dotenv dependency)
const envContent = readFileSync(".env.local", "utf8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx > 0) {
    const key = trimmed.substring(0, eqIdx).trim();
    const value = trimmed.substring(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const permit = new Permit({
  token: process.env.PERMIT_API_KEY,
  pdp: process.env.PERMIT_PDP_URL ?? "https://cloudpdp.api.permit.io",
  log: { level: "error" },
});

const checks = [
  ["user-admin", "view", "products"],
  ["user-admin", "view_pricing", "pricing"],
  ["user-admin", "view", "orders"],
  ["user-admin", "create", "orders"],
  ["user-admin", "view", "quotes"],
  ["user-admin", "create", "quotes"],
  ["user-admin", "view", "cart"],
  ["user-admin", "create", "cart"],
  ["user-admin", "view", "admin_dashboard"],
  ["user-admin", "manage", "users"],
];

console.log("=== Permit.io Permission Check ===");
console.log(`API Key: ${process.env.PERMIT_API_KEY?.substring(0, 20)}...`);
console.log(`PDP URL: ${process.env.PERMIT_PDP_URL}`);
console.log("");

for (const [userId, action, resource] of checks) {
  try {
    const allowed = await permit.check(userId, action, resource);
    const icon = allowed ? "✅" : "❌";
    console.log(`  ${icon} ${userId} | ${action}:${resource} => ${allowed}`);
  } catch (err) {
    console.log(`  ⚠️  ${userId} | ${action}:${resource} => ERROR: ${err.message}`);
  }
}

console.log("\n=== API Key Scope ===");
try {
  const scope = await permit.api.getApiKeyScope();
  console.log(`  Organization: ${scope.organization_id} (${scope.organization ?? ""})`);
  console.log(`  Project: ${scope.project_id} (${scope.project ?? ""})`);
  console.log(`  Environment: ${scope.environment_id} (${scope.environment ?? ""})`);
} catch (err) {
  console.log(`  ⚠️ Could not get scope: ${err.message}`);
}

console.log("\n=== Checking Users in Permit ===");
try {
  const users = await permit.api.users.list();
  console.log(`  Found ${users.length ?? users?.data?.length ?? 0} users:`);
  const userList = users.data ?? users;
  for (const u of userList) {
    console.log(`    - ${u.key} (${u.email ?? "no email"}) roles: ${JSON.stringify(u.roles ?? [])}`);
  }
} catch (err) {
  console.log(`  ⚠️ Could not list users: ${err.message}`);
}

console.log("\n=== Checking Resources in Permit ===");
try {
  const resources = await permit.api.resources.list();
  const resList = resources.data ?? resources;
  console.log(`  Found ${resList.length} resources:`);
  for (const r of resList) {
    const actions = Object.keys(r.actions ?? {}).join(", ");
    console.log(`    - ${r.key} => actions: [${actions}]`);
  }
} catch (err) {
  console.log(`  ⚠️ Could not list resources: ${err.message}`);
}

console.log("\n=== Checking Roles in Permit ===");
try {
  const roles = await permit.api.roles.list();
  const roleList = roles.data ?? roles;
  console.log(`  Found ${roleList.length} roles:`);
  for (const r of roleList) {
    console.log(`    - ${r.key} (${r.name}) permissions: [${(r.permissions ?? []).join(", ")}]`);
  }
} catch (err) {
  console.log(`  ⚠️ Could not list roles: ${err.message}`);
}

console.log("\nDone.");
