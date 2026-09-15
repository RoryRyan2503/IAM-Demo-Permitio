# Migration Guide: Multi-Provider Authorization (Permit.io → Permit.io + PingAuthorize)

This document explains the architectural changes made to support **pluggable
authorization providers**, why they were made this way, and how to operate /
extend the system. It complements the [README](./README.md), which covers
day-to-day setup.

---

## 1. Why

The app originally called Permit.io directly from one choke-point function,
`canAccess()`. The goal of this migration was to let the app run against
**either Permit.io or PingAuthorize** (switchable via config or at runtime),
without touching the ~15 call sites that already depend on `canAccess()`, and
without hard-coding either vendor's SDK/API into route handlers.

## 2. What changed

### Before

```
API route → canAccess(userId, action, resource, ...) → Permit SDK (permitClient.ts)
                                                       → toolBasedRebac() fallback
```

### After

```
API route → canAccess(...)                     [unchanged signature, now a thin wrapper]
              → AuthorizationService.checkAccess(...)   [NEW single entry point]
                  → Provider Factory (env var / runtime override)
                      → PermitProvider           → Permit SDK → toolBasedRebac() fallback
                      → PingAuthorizeProvider     → PingAuthorize PDP → toolBasedRebac() fallback
                  → decision cache (3s TTL)
                  → audit log (ring buffer, last 500 decisions)
```

**Zero call sites changed.** `canAccess(userId, action, resource, context?, userRole?, resourceAttributes?)`
keeps its exact original signature and behavior; it now simply delegates to
`AuthorizationService.checkAccess()`. This was a deliberate choice to minimize
risk/churn — see [Section 5](#5-key-design-decisions).

## 3. New files

| File | Purpose |
|---|---|
| `lib/authorization/providers/AuthorizationProvider.ts` | The pluggable interface every provider implements: `checkAccess`, `checkAccessDetailed`, `getProviderName`, `getConnectivityStatus`. |
| `lib/authorization/providers/PermitProvider.ts` | Wraps the existing Permit.io SDK client behind the interface. |
| `lib/authorization/providers/PingAuthorizeProvider.ts` | Wraps the new PingAuthorize REST client behind the interface. |
| `lib/authorization/fallbackRebac.ts` | The tool-based RBAC fallback logic (extracted from the old `canAccess.ts` so both providers can share it). |
| `lib/authorization/providerFactory.ts` | Resolves which provider is "active" — runtime override (Admin Console toggle) takes priority over the `AUTH_PROVIDER` env var, which defaults to `"permit"`. |
| `lib/authorization/AuthorizationService.ts` | The new single entry point. All authorization decisions flow through `checkAccess()` / `checkAccessDetailed()`. |
| `lib/authorization/decisionCache.ts` | Short-TTL (3s) in-memory cache keyed by (provider, subject, resource, action, context) to avoid redundant PDP round-trips within a page load. |
| `lib/authorization/auditLog.ts` | In-memory ring buffer (max 500 entries) recording every decision for the Admin Console's audit trail. |
| `services/ping-authorize/types.ts` | PingAuthorize domain types: `PingPolicy`, `PingPolicySet`, `DecisionRequest`/`DecisionResult`, etc. |
| `services/ping-authorize/client.ts` | Low-level REST client: Basic Auth, retry/backoff on 502/503/504 + network errors, `X-Respond-With` header support. |
| `services/ping-authorize/demoStore.ts` | Seeded in-memory Policy Set/Policy store so the feature works with zero external PingAuthorize deployment. |
| `services/ping-authorize/policySets.ts`, `policies.ts` | CRUD functions — call the real PAP when `PING_PAP_URL` is configured, otherwise operate on the demo store. |
| `services/ping-authorize/decisions.ts` | Evaluates access — calls the real PDP (`POST {PING_PDP_URL}/governance-engine`) when configured, otherwise runs a local deny-overrides/default-deny evaluator over the demo policies. |
| `app/api/admin/{auth-provider,policy-sets,policy-sets/[id],policies,policies/[id],test-access,audit-log}/route.ts` | Admin-only REST endpoints backing the new Admin Console tabs. |
| `components/admin/{ProviderPanel,PolicySetsPanel,PoliciesPanel,PolicyEditor}.tsx` | Admin Console UI: provider switch/connectivity, Policy Set CRUD, Policy CRUD, visual policy editor with generated JSON preview. |
| `app/(portal)/admin/test-access/page.tsx` | Decision Testing Console — runs one request against both providers and shows a side-by-side ALLOW/DENY comparison. |

## 4. Modified files

- **`lib/authorization/canAccess.ts`** — rewritten as a thin backward-compatible wrapper over `AuthorizationService.checkAccess()`.
- **`app/(portal)/admin/page.tsx`** — added "Provider", "Policy Sets", "Policies" tabs alongside the pre-existing "Policy Matrix" and "Demo Users" tabs, plus a link to the Decision Testing Console.
- **`components/layout/Sidebar.tsx`** — nav label "Admin" → "Admin Console".
- **`types/index.ts`** — `PermissionResource` union extended with `"invoices" | "accounts" | "reports" | "policy_sets" | "policies"` to cover the new PingAuthorize demo persona resources.
- **`.env.local.example`** — new PingAuthorize section (`AUTH_PROVIDER`, `PING_PAP_URL`, `PING_PDP_URL`, `PING_USERNAME`, `PING_PASSWORD`).

## 5. Key design decisions

1. **`canAccess()` kept as a compatible wrapper**, rather than rewriting every
   call site to use `AuthorizationService` directly. This made the migration
   a pure additive change to the ~15 existing routes — zero risk of breaking
   current behavior, and the new architecture is fully exercised the moment
   the wrapper delegates to it.
2. **Fail-closed on unexpected errors, fail-open only to the documented
   fallback.** Every provider catches unexpected exceptions and falls back to
   `toolBasedRebac()` — the same tool-based RBAC the app already used when
   Permit.io wasn't configured — rather than throwing or defaulting to allow.
3. **Provider Factory + singleton caching via `globalThis`**, matching the
   existing pattern in `lib/debug/traceStore.ts`. This keeps provider
   instances (and the demo store / decision cache / audit log) stable across
   Next.js dev-mode hot reloads.
4. **PingAuthorize runs in local "demo mode" when unconfigured.** The real JSON
   PDP API request/response schema (Domain/Action/Service/IdentityProvider +
   flat `attributes` map, `decision`/`authorized`/`statements` response — see
   [Section 9](#9-pingauthorize-trust-framework--pap-setup-grounded)) is now
   verified against the official PingAuthorize Server Administration Guide.
   The exact PAP CRUD endpoint paths for authoring policies are still not
   publicly documented, so `services/ping-authorize/` provides a fully working
   local demo store + local decision evaluator (deny-overrides, default-deny)
   so every Admin Console feature — Policy Sets, Policies, Decision Testing —
   is usable and demoable without a real PingAuthorize instance. When
   `PING_PAP_URL`/`PING_PDP_URL` are set, the same code paths call the real
   APIs instead.
5. **Decision caching is short-TTL (3s) and in-memory only** — intended to
   avoid duplicate PDP calls within a single page render, not as a durable
   cache layer. It is not shared across server instances.
6. **No new centralized authorization *middleware*** was introduced; existing
   per-route `validateRequest` + inline admin-role checks were kept for
   consistency with the rest of the codebase, since introducing a different
   pattern for only the new admin routes would fragment the codebase's
   conventions rather than simplify it.

## 6. How to switch providers

**Option A — environment variable (persists across restarts):**

```env
AUTH_PROVIDER=ping   # or "permit" (default)
```

**Option B — runtime toggle (no restart, resets on server restart):**

Admin Console → **Provider** tab → click "Permit.io" or "PingAuthorize".
This calls `POST /api/admin/auth-provider` and stores the override in-memory
via the Provider Factory; it takes priority over `AUTH_PROVIDER` until the
server restarts or "Reset to env default" is clicked.

## 7. How to compare decisions between providers

Admin Console → **Decision Testing** (`/admin/test-access`). Enter a
user/role/persona/resource/action (+ optional ABAC context: sales orgs,
account, tool IDs, super-user flag) and click "Run Comparison". This calls
`POST /api/admin/test-access`, which runs `checkAccessDetailed()` against
**both** providers in parallel (regardless of which one is currently active)
and returns a side-by-side ALLOW/DENY result with engine name, latency, and
raw decision detail for each.

## 8. Extending with a third provider

1. Implement `AuthorizationProvider` (see `PingAuthorizeProvider.ts` as a template).
2. Add the new provider name to `AuthProviderName` in `lib/authorization/providerFactory.ts` and wire it into `getProviderByName()` / `listAvailableProviders()`.
3. Add any new env vars to `.env.local.example` and the README's environment variable table.
4. No changes needed to `AuthorizationService`, `canAccess()`, or any existing route — they are provider-agnostic by construction.

## 9. PingAuthorize Trust Framework + PAP setup (grounded)

This section is grounded in the official PingAuthorize Server Administration
Guide's JSON PDP API request/response format (verified verbatim, September
2026) — not a simplification. If you're pointing this app at a **real**
PingAuthorize tenant (`PING_PAP_URL`/`PING_PDP_URL` set), configure it as
follows.

### 9.1 The real wire format (not subject/resource/action/environment)

PingAuthorize's JSON PDP API (`POST {PING_PDP_URL}/governance-engine`) does
**not** accept a nested ABAC object. It has exactly five top-level fields:

```json
{
  "domain": "Persona.Procurement",
  "action": "view",
  "service": "Commerce.Products",
  "identityProvider": "PingOne.HonDemo",
  "attributes": {
    "Subject.Id": "user-buyer",
    "Subject.Role": "buyer",
    "Subject.Persona": "GBE",
    "Subject.IsSuperUser": "false",
    "Subject.AllowedSalesOrgs": "BA01,BA02",
    "Subject.SelectedAccountId": "001ACC001",
    "Subject.ToolIds": "TL001,TL003",
    "Resource.Type": "products"
  }
}
```

`domain`, `action`, `service`, `identityProvider` are optional, coarse,
dot-namespaced strings used for high-level policy routing. `attributes` is
**required** (may be `{}`) — a flat `map<string, string>` of "Other
Attributes"; **every key must exactly match the name of a Trust Framework
attribute you define in the PAP GUI with a "Request resolver"**. There is no
nesting on the wire — `toTrustFrameworkRequest()` in
[services/ping-authorize/decisions.ts](services/ping-authorize/decisions.ts)
is what flattens this app's internal subject/resource/action model into this
shape before every real PDP call.

The response looks like:

```json
{
  "decision": "PERMIT",
  "authorized": true,
  "statements": [{ "name": "...", "obligatory": true, "fulfilled": false }],
  "status": { "code": "OKAY", "messages": [], "errors": [] }
}
```

`authorized` (boolean) is what this app treats as the definitive decision;
`decision` is the human-readable uppercase `"PERMIT"`/`"DENY"` equivalent.
`statements[]` carries advice/obligations — this app does not act on them,
only surfaces their `name`s in the Decision Testing Console's "reason" field.

### 9.2 Mapping design used by this app

| App concept | Trust Framework field | Example |
|---|---|---|
| Resource type (`products`, `orders`, ...) | `service` | `Commerce.Products`, `Admin.PolicySets` |
| Action (`view`, `create`, ...) | `action` | `view`, `view_pricing`, `manage` |
| Subject persona (or role, if no persona) | `domain` | `Persona.Procurement`, `Role.Admin` |
| Auth source (constant — this app uses Ping Identity OIDC) | `identityProvider` | `PingOne.HonDemo` |
| Subject id/role/persona/isSuperUser/allowedSalesOrgs/selectedAccountId/toolIds | `attributes["Subject.*"]` | `Subject.Role = "buyer"` |
| Resource instance attrs (e.g. a product's sales org) | `attributes["Resource.*"]` | `Resource.SalesOrgId = "BA01"` |
| Environment attrs (none populated today) | `attributes["Environment.*"]` | — |

Resources are namespaced `Admin.*` for `admin_dashboard`/`users`/`policy_sets`/`policies`,
and `Commerce.*` for everything else (`products`, `orders`, `quotes`, `cart`).

### 9.3 Step-by-step: configure the Trust Framework in the PAP GUI

1. Open the PingAuthorize **Policy Administration GUI** and go to the **Trust
   Framework** section.
2. Create the following attributes, each with **Value Settings type = string**
   and a **Request resolver** pointing at the matching key in the request's
   `attributes` map (so the PAP knows how to pull the value out of an
   incoming JSON PDP request):

   | Attribute name (must match `attributes` map key exactly) | Purpose |
   |---|---|
   | `Subject.Id` | User identifier |
   | `Subject.Role` | `admin` \| `buyer` \| `viewer` |
   | `Subject.Persona` | e.g. `GBE`, `general`, `procurement` |
   | `Subject.IsSuperUser` | `"true"` / `"false"` |
   | `Subject.AllowedSalesOrgs` | comma-joined sales org codes |
   | `Subject.SelectedAccountId` | currently selected account id |
   | `Subject.ToolIds` | comma-joined approved tool ids |
   | `Resource.Type` | resource type (redundant with `service`, but convenient to match on directly) |
   | `Resource.SalesOrgId` | instance-level product attribute (only present on some requests) |

3. Confirm `Domain`, `Action`, `Service`, and `Identity Provider` are
   available as first-class Trust Framework attribute types (they're built
   in) — no extra setup needed for those four.

### 9.4 Step-by-step: author the policies

Create one Policy Set per app "role" concept, then Policies inside each that
match on `service` + `action` + the `Subject.Role`/`Subject.Persona`
attribute, mirroring the same Buyer/Viewer parity policies from the earlier
discussion in this conversation (see Section 4 there) — just expressed with
real Trust Framework fields instead of the demo editor's generic
subject/resource/action condition groups:

| Policy | Domain match | Service match | Action match | Effect |
|---|---|---|---|---|
| Admin — Full Access | `Subject.Role` = `admin` (attribute condition) | any | any | Permit |
| Buyer — Products | any | `Commerce.Products` | `view`, `view_pricing` | Permit (condition: `Subject.Role` = `buyer`) |
| Buyer — Orders | — | `Commerce.Orders` | `view`, `create` | Permit (condition: `Subject.Role` = `buyer`) |
| Buyer — Quotes | — | `Commerce.Quotes` | `view` | Permit (condition: `Subject.Role` = `buyer`) |
| Buyer — Cart | — | `Commerce.Cart` | `view`, `create`, `delete` | Permit (condition: `Subject.Role` = `buyer`) |
| Viewer — Products | — | `Commerce.Products` | `view` | Permit (condition: `Subject.Role` = `viewer`) |
| Viewer — Orders | — | `Commerce.Orders` | `view` | Permit (condition: `Subject.Role` = `viewer`) |

Use `Subject.Role` (an `attributes` entry) as the actual matching condition
rather than `domain`, since `domain` in this app's mapping carries persona
(`Persona.*`) unless persona is absent — `Subject.Role` is always present and
reliable for every user.

Set the Policy Set's / Policies' combining algorithm to **deny-overrides**
with a **default deny** (no matching policy → Deny) to match this app's local
demo evaluator semantics exactly, so behavior is identical whether
`PING_PDP_URL` is configured or not.

### 9.5 Verify

Use `/admin/test-access` (role=`buyer`, resource=`products`,
action=`view_pricing`) after switching the active provider to PingAuthorize —
both Permit.io and PingAuthorize should return `ALLOW` once the policies
above are published.
