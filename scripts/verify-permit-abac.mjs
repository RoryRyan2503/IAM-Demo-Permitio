/**
 * Verify Permit.io config after fix-permit-abac.mjs
 * Usage: node scripts/verify-permit-abac.mjs
 */
import { Permit } from "permitio";
import { readFileSync } from "fs";

const e = readFileSync(".env.local", "utf8");
for (const l of e.split("\n")) {
  const t = l.trim(); if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("="); if (i > 0 && !process.env[t.slice(0, i).trim()]) process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}
const permit = new Permit({
  token: process.env.PERMIT_API_KEY,
  pdp: process.env.PERMIT_PDP_URL ?? "https://cloudpdp.api.permit.io",
  log: { level: "error" },
});

console.log("Waiting 3s for PDP policy sync...\n");
await new Promise((r) => setTimeout(r, 3000));

async function check(label, user, action, resource, expect) {
  try {
    const allowed = await permit.check(user, action, resource);
    const ok = expect === undefined ? "  " : allowed === expect ? "PASS" : "FAIL";
    console.log(`  [${ok}] ${allowed ? "✅" : "❌"} ${label} => ${allowed}`);
  } catch (err) {
    console.log(`  [ERR ] ⚠️  ${label} => ${err.message.slice(0, 70)}`);
  }
}

const buyer = { key: "user-buyer", attributes: { allowedSalesOrgs: ["IA001", "BA002"], persona: "procurement", selectedAccountId: "ACC100" } };

console.log("=== RBAC: product collection access (the 'Access Denied' fix) ===");
await check("admin  view products", "user-admin", "view", "products", true);
await check("buyer  view products", buyer, "view", "products", true);
await check("viewer view products", "user-viewer", "view", "products", true);
await check("buyer  view_pricing products", buyer, "view_pricing", "products", true);

console.log("\n=== RBAC: role boundaries ===");
await check("viewer view_pricing products", "user-viewer", "view_pricing", "products", false);
await check("viewer view admin_dashboard", "user-viewer", "view", "admin_dashboard", false);
await check("buyer  manage users", buyer, "manage", "users", false);
await check("admin  view admin_dashboard", "user-admin", "view", "admin_dashboard", true);

console.log("\nNote 1: Per-product SALES-ORG scoping is enforced in app code");
console.log("        (Supabase .in filter for the list + explicit check in");
console.log("        app/api/products/[id]/route.ts) because a collection check");
console.log("        cannot carry a per-item sales_org_id.");
console.log("Note 2: Quote-creation PERSONA gating is enforced in app code");
console.log("        (app/api/quotes/route.ts) because custom ABAC user-sets do");
console.log("        not reliably evaluate on the shared cloud PDP. The Permit");
console.log("        policy (quote_creation user-set) documents the same intent.");
console.log("\nDone.");
