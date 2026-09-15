/**
 * setup-ping-policies.mjs — scaffolds the PingAuthorize policy tree needed to
 * replicate this app's proven-working Permit.io RBAC model (see
 * scripts/fix-permit-abac.mjs for the Permit-side equivalent).
 *
 * WHAT THIS SCRIPT DOES (safe, additive, non-destructive):
 *   - Verifies connectivity to PING_PAP_URL / PING_BRANCH_ID / PING_USER_ID.
 *   - Reads the existing "EcomWebApp" Policy Set (created previously in your
 *     tenant) and lists what's already there (e.g. the "Admin Check" Policy).
 *   - Creates two NEW sibling Policies — "Buyer Check" and "Viewer Check" —
 *     each with a single Rule that Permits when Subject.Role equals that
 *     role, using the EXACT condition grammar already proven live in your
 *     tenant's "Admin Check" > "AllowRule":
 *       { "and": { "conditions": [ { "comparison": {
 *           "left": { "attribute": { "id": ROLE_ATTRIBUTE_ID } },
 *           "op": "Equals", "right": { "constant": { "value": "<role>" } }
 *       } } ] } }
 *   - Appends them as children of the "EcomWebApp" Policy Set.
 *
 * WHAT THIS SCRIPT DELIBERATELY DOES NOT DO (do these in Policy Studio GUI):
 *   1. It does NOT touch the existing "Admin Check" Policy. That policy's
 *      "DenyRule" (Subject.Role NotEquals admin -> Deny) makes it Applicable
 *      for EVERY request, not just admin ones. Combined with the Policy
 *      Set's "FirstApplicable" combining algorithm, that DenyRule will
 *      short-circuit and deny Buyer/Viewer before their policies are ever
 *      reached. Before this will work end-to-end, open "Admin Check" in
 *      Policy Studio and DELETE its "DenyRule" (keep only "AllowRule"), so
 *      non-admins fall through to the next sibling policy instead of being
 *      denied outright. Add ONE final catch-all "Default Deny" policy as the
 *      LAST child of EcomWebApp (unconditional Deny, no condition) so anyone
 *      not matched by a role policy is denied by default.
 *   2. It does NOT scope Buyer/Viewer to specific resources/actions
 *      (products vs orders, view vs create, etc.) — that requires comparing
 *      the request's built-in `Action` / `Service` fields, whose Trust
 *      Framework attribute IDs are NOT exposed via the REST API discovered
 *      in this tenant (only reachable in the Policy Studio GUI's condition
 *      builder). See the policy matrix in MIGRATION.md / chat for exactly
 *      which Rules to add inside each Policy (one Rule per action, gated by
 *      `Action Equals "view"` AND `Service Equals "Commerce.Products"` etc.).
 *   3. It does NOT deploy/publish anything. Every governance-engine decision
 *      call observed during setup returned "INDETERMINATE" — the PDP
 *      evaluates a DEPLOYED SNAPSHOT of a branch, not the live editable
 *      branch. You must use Policy Studio's Branch → Snapshot → Deploy (or
 *      "Publish") flow to make edits here actually take effect at the PDP.
 *
 * IMPORTANT: ROLE_ATTRIBUTE_ID below was reverse-engineered by reading the
 * existing "Admin Check" > "AllowRule" condition live from your tenant. It
 * is very likely the "Subject.Role" attribute (compared against the literal
 * string "admin"), but this was NOT independently confirmed by name (the
 * attribute registry isn't exposed over REST in this tenant). Open the rule
 * in Policy Studio once before trusting this in a real deployment.
 *
 * Usage: node scripts/setup-ping-policies.mjs
 */
import { readFileSync } from "fs";

const envContent = readFileSync(".env.local", "utf8");
for (const line of envContent.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i > 0 && !process.env[t.slice(0, i).trim()]) process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // self-signed cert on the demo EC2 PAP host

const PAP = (process.env.PING_PAP_URL ?? "").replace(/\/$/, "");
const BRANCH = process.env.PING_BRANCH_ID;
const USER_ID = process.env.PING_USER_ID;
const POLICYSET_NAME = "EcomWebApp";

// Reverse-engineered from the live "Admin Check" > "AllowRule" condition — verify in Policy Studio before trusting.
const ROLE_ATTRIBUTE_ID = "860496db-c46b-48ee-bdbf-a2f6773bc4a5";

if (!PAP || !BRANCH || !USER_ID) {
  console.error("Missing PING_PAP_URL / PING_BRANCH_ID / PING_USER_ID in .env.local — aborting.");
  process.exit(1);
}

const headers = { "x-user-id": USER_ID, "Content-Type": "application/json" };

async function api(path, method = "GET", body = null) {
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(PAP + path, opts);
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, body: json };
}

function roleAllowRule(role) {
  return {
    type: "Rule",
    name: "AllowRule",
    description: `Permit when Subject.Role equals "${role}"`,
    shared: false,
    disabled: false,
    condition: {
      and: {
        conditions: [
          {
            comparison: {
              left: { attribute: { id: ROLE_ATTRIBUTE_ID } },
              op: "Equals",
              right: { constant: { value: role } },
            },
          },
        ],
      },
    },
    effectSettings: { type: "unconditionalPermit" },
  };
}

async function main() {
  console.log(`PAP: ${PAP}  Branch: ${BRANCH}\n`);

  // 1. Find the EcomWebApp Policy Set
  console.log(`1. Looking up Policy Set "${POLICYSET_NAME}"...`);
  const psList = await api(`/v2/policy-manager/policysets?branch=${encodeURIComponent(BRANCH)}&page=1&page-size=100`);
  const policySet = psList.body?.data?.find((p) => p.name === POLICYSET_NAME);
  if (!policySet) {
    console.error(`   ❌ Policy Set "${POLICYSET_NAME}" not found. Create it first in Policy Studio (or adjust POLICYSET_NAME).`);
    process.exit(1);
  }
  console.log(`   ✅ Found ${policySet.id} (${(policySet.children ?? []).length} existing children)`);

  const existingPolicies = await api(`/v2/policy-manager/policies?branch=${encodeURIComponent(BRANCH)}&page=1&page-size=100`);
  const byName = (name) => existingPolicies.body?.data?.find((p) => p.name === name);

  // 2. Create "Buyer Check" and "Viewer Check" Policies (skip if they already exist)
  const newChildren = [];
  for (const role of ["buyer", "viewer"]) {
    const policyName = `${role[0].toUpperCase()}${role.slice(1)} Check`;
    const already = byName(policyName);
    if (already) {
      console.log(`\n2. "${policyName}" already exists (${already.id}) — skipping create.`);
      continue;
    }

    console.log(`\n2. Creating "${policyName}"...`);
    const created = await api(`/v2/policy-manager/policies?branch=${encodeURIComponent(BRANCH)}`, "POST", {
      type: "Policy",
      name: policyName,
      description: `Coarse role gate — Permit when Subject.Role == "${role}". Add resource/action-scoped Rules in Policy Studio (see policy matrix).`,
      shared: false,
      disabled: false,
      combiningAlgorithm: { algorithm: "FirstApplicable", evaluateAll: false },
    });
    if (created.status >= 300) {
      console.log(`   ❌ create policy failed (${created.status})`, JSON.stringify(created.body).slice(0, 200));
      continue;
    }
    console.log(`   ✅ Policy ${created.body.id}`);

    const rule = await api(`/v2/policy-manager/rules?branch=${encodeURIComponent(BRANCH)}`, "POST", roleAllowRule(role));
    if (rule.status >= 300) {
      console.log(`   ❌ create rule failed (${rule.status})`, JSON.stringify(rule.body).slice(0, 200));
      continue;
    }
    console.log(`   ✅ Rule ${rule.body.id} (AllowRule)`);

    // Wire the Rule into the Policy's children
    const wirePolicy = await api(
      `/v2/policy-manager/policies/${encodeURIComponent(created.body.id)}?branch=${encodeURIComponent(BRANCH)}`,
      "PUT",
      { ...created.body, children: [{ id: rule.body.id, type: "Rule" }] }
    );
    console.log(`   ${wirePolicy.status < 300 ? "✅" : "❌"} wired rule into policy children`);

    newChildren.push({ id: created.body.id, type: "Policy" });
  }

  // 3. Append the new Policies as children of EcomWebApp
  if (newChildren.length) {
    console.log(`\n3. Wiring ${newChildren.length} new Policy(ies) into "${POLICYSET_NAME}"...`);
    const children = [...(policySet.children ?? []), ...newChildren];
    const updated = await api(
      `/v2/policy-manager/policysets/${encodeURIComponent(policySet.id)}?branch=${encodeURIComponent(BRANCH)}`,
      "PUT",
      { ...policySet, children }
    );
    console.log(`   ${updated.status < 300 ? "✅" : "❌"} ${POLICYSET_NAME} now has ${children.length} children`);
  } else {
    console.log("\n3. Nothing new to wire in.");
  }

  console.log(`
=== NEXT STEPS (must be done in Policy Studio GUI) ===
  1. Open "Admin Check" and DELETE its "DenyRule" — keep only "AllowRule".
     (Otherwise FirstApplicable denies every non-admin before reaching
     Buyer/Viewer Check.)
  2. Add a final "Default Deny" Policy as the LAST child of "${POLICYSET_NAME}"
     (single Rule, no condition, unconditionalDeny) so anyone not matched
     by a role policy is denied.
  3. Inside "Buyer Check" / "Viewer Check", add one Rule per allowed
     resource+action (condition: Action Equals "<action>" AND Service
     Equals "Commerce.<Resource>") per the policy matrix.
  4. Publish/Deploy the branch — decisions stay INDETERMINATE until you do.
  5. Re-test with /admin/test-access after switching AUTH_PROVIDER to ping.
`);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
