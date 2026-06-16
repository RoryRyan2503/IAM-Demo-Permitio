import { readFileSync } from "fs";
const e = readFileSync(".env.local", "utf8");
for (const l of e.split("\n")) {
  const t = l.trim(); if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("="); if (i > 0 && !process.env[t.slice(0, i).trim()]) process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}
const K = process.env.PERMIT_API_KEY, B = "https://api.permit.io/v2";
const h = { Authorization: "Bearer " + K, "Content-Type": "application/json" };
const s = await (await fetch(B + "/api-key/scope", { headers: h })).json();
const sc = `/schema/${s.project_id}/${s.environment_id}`;

const roles = await (await fetch(B + sc + "/roles", { headers: h })).json();
console.log("ROLES:");
for (const r of (roles.data ?? roles)) console.log(`  key=${r.key}  name=${r.name}  perms=${(r.permissions || []).join(",")}`);

const ua = await (await fetch(B + sc + "/resources/__user/attributes", { headers: h })).json();
const attrs = ua.data ?? ua;
console.log("\nUSER ATTRS:", Array.isArray(attrs) ? attrs.map(a => `${a.key}:${a.type}`).join(", ") : JSON.stringify(ua).slice(0, 200));
