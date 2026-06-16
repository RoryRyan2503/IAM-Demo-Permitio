/**
 * Confirm condition set RULES (grants) + test the typo theory.
 * Usage: node scripts/diagnose-grants.mjs
 */
import { Permit } from "permitio";
import { readFileSync } from "fs";

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
  return { status: res.status, body: await res.json() };
}
const scope = await api("/api-key/scope");
const proj = scope.body.project_id, envId = scope.body.environment_id;
console.log(`PDP URL used: ${process.env.PERMIT_PDP_URL ?? "https://cloudpdp.api.permit.io"}\n`);

console.log("=== condition_set_rules (raw) ===");
const r = await api(`/facts/${proj}/${envId}/condition_set_rules`);
console.log("  status:", r.status);
console.log("  body:", JSON.stringify(r.body).slice(0, 800));

// Test typo theory: does the BUYER base role alone grant products:view?
console.log("\n=== Is products:view coming from base role or ABAC? ===");
async function check(label, attrs, resourceObj) {
  const allowed = await permit.check({ key: "user-buyer", attributes: attrs }, "view", resourceObj);
  console.log(`  ${allowed ? "✅" : "❌"} ${label} => ${allowed}`);
}
// no attributes at all, no org → if true, base role still grants it
await check("no attrs, no org", {}, { type: "products", attributes: {} });
// singular spelling (matches the condition set typo) with disallowed org
await check("allowedSalesOrg(singular)=[IA001], org=PA001", { allowedSalesOrg: ["IA001"] }, { type: "products", attributes: { sales_org_id: "PA001" } });
console.log("\nDone.");
