import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest, type NextResponse } from "next/server";
import { canAccess } from "@/lib/authorization/canAccess";
import { searchCatalogProducts } from "@/services/catalog/productSearch";
import { AuthorizationUnavailableError } from "@/lib/authorization/providers/AuthorizationProvider";
import { CART_COOKIE_NAME, readCart, writeCart } from "@/lib/cart/cookie";
import { GET, POST, DELETE } from "./route";

const state = vi.hoisted(() => ({ userId: "user-a", accountId: "account-a" }));
vi.mock("@/lib/api/validateRequest", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/validateRequest")>("@/lib/api/validateRequest");
  return {
    authErrorResponse: actual.authErrorResponse,
    validateRequest: vi.fn(async () => ({
      session: { userId: state.userId },
      userContext: {
        user: { role: "buyer", isSuperUser: false },
        selectedAccount: { accountId: state.accountId },
        selectedSalesOrgs: ["1265"],
      },
      permitContext: { selectedAccountId: state.accountId },
    })),
  };
});
vi.mock("@/lib/authorization/canAccess", () => ({ canAccess: vi.fn() }));
vi.mock("@/services/catalog/productSearch", () => ({ searchCatalogProducts: vi.fn() }));

const product = {
  id: "SKU-1", productId: "family-1", name: "Catalog product", sku: "SKU-1",
  price: 2500, currency: "USD", sales_org_id: "1265", category: "Switches",
  description: "", domain: "", country: "", image_url: null, created_at: "",
  familyName: "", familyDescription: "", longDescription: "", brand: "", business: "",
  categoryPath: [], availableCountries: [], unitOfMeasure: "",
};

function request(method = "GET", cookie?: string, body?: unknown, query = "") {
  return new NextRequest(`http://localhost/api/cart${query}`, {
    method,
    headers: cookie ? { Cookie: `${CART_COOKIE_NAME}=${cookie}` } : {},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
function cookie(response: NextResponse) {
  return response.cookies.get(CART_COOKIE_NAME)?.value;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SESSION_SECRET", "test-cart-signing-secret-with-32-characters");
  vi.spyOn(console, "error").mockImplementation(() => {});
  state.userId = "user-a";
  state.accountId = "account-a";
  vi.mocked(canAccess).mockResolvedValue(true);
  vi.mocked(searchCatalogProducts).mockResolvedValue({ products: [product], total: 1, sources: ["Coveo"], warnings: [] });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it("adds a Coveo-only SKU, persists it, updates quantity and removes it without a database", async () => {
  const added = await POST(request("POST", undefined, { sku: "SKU-1", quantity: 2, price: 1 }));
  expect(added.status).toBe(201);
  expect(added.cookies.get(CART_COOKIE_NAME)?.httpOnly).toBe(true);
  const loaded = await GET(request("GET", cookie(added)));
  expect(await loaded.json()).toMatchObject({
    data: [{ product_id: "SKU-1", quantity: 2, products: { price: 2500 } }],
    meta: { total: 5000 },
  });
  const updated = await POST(request("POST", cookie(added), { productId: "SKU-1", quantity: 3 }));
  expect(readCart(cookie(updated), "user-a")[0].quantity).toBe(3);
  const removed = await DELETE(request("DELETE", cookie(updated), undefined, "?productId=SKU-1"));
  const empty = await GET(request("GET", cookie(removed)));
  expect(await empty.json()).toMatchObject({ data: [], meta: { total: 0 } });
});

it("isolates accounts/users and clears only the selected account", async () => {
  const saved = writeCart([
    { accountId: "account-a", sku: "SKU-1", quantity: 2 },
    { accountId: "account-b", sku: "SKU-1", quantity: 5 },
  ], "user-a");
  const response = await GET(request("GET", saved));
  expect((await response.json()).data).toMatchObject([{ quantity: 2 }]);
  const cleared = await DELETE(request("DELETE", saved, undefined, "?clear=true"));
  expect(readCart(cookie(cleared), "user-a")).toEqual([{ accountId: "account-b", sku: "SKU-1", quantity: 5 }]);
  state.accountId = "account-b";
  const otherAccount = await GET(request("GET", cookie(cleared)));
  expect((await otherAccount.json()).data).toMatchObject([{ quantity: 5 }]);
  state.userId = "user-b";
  const otherUser = await GET(request("GET", saved));
  expect((await otherUser.json()).data).toEqual([]);
});

it.each([null, "restricted"] as const)("never totals missing or %s prices as free", async (price) => {
  if (price === null) {
    vi.mocked(searchCatalogProducts).mockResolvedValue({
      products: [{ ...product, price: null }], total: 1, sources: ["Coveo"], warnings: [],
    });
  } else {
    vi.mocked(canAccess).mockImplementation(async (_id, action) => action !== "view_pricing");
  }
  const response = await GET(request("GET", writeCart([
    { accountId: "account-a", sku: "SKU-1", quantity: 1 },
  ], "user-a")));
  expect(await response.json()).toMatchObject({ data: [{ products: { price: null } }], meta: { total: null } });
});

it.each([0, -1, 1.5, 1000, "2"])("rejects invalid quantity %s before catalog/storage changes", async (quantity) => {
  const response = await POST(request("POST", undefined, { sku: "SKU-1", quantity }));
  expect(response.status).toBe(400);
  expect(cookie(response)).toBeUndefined();
  expect(searchCatalogProducts).not.toHaveBeenCalled();
});

it("preserves authorization denials and outages without setting a cart cookie", async () => {
  vi.mocked(canAccess).mockResolvedValueOnce(false);
  const denied = await POST(request("POST", undefined, { sku: "SKU-1" }));
  expect(denied.status).toBe(403);
  vi.mocked(canAccess).mockRejectedValueOnce(new AuthorizationUnavailableError());
  const unavailable = await POST(request("POST", undefined, { sku: "SKU-1" }));
  expect(unavailable.status).toBe(503);
  expect(cookie(unavailable)).toBeUndefined();
  expect(searchCatalogProducts).not.toHaveBeenCalled();
});

it("rejects a catalog product outside the account's sales organizations", async () => {
  vi.mocked(searchCatalogProducts).mockResolvedValue({
    products: [{ ...product, sales_org_id: "9999" }], total: 1, sources: ["Coveo"], warnings: [],
  });
  const response = await POST(request("POST", undefined, { sku: "SKU-1" }));
  expect(response.status).toBe(403);
  expect(cookie(response)).toBeUndefined();
});

it("reports and clears an invalid cookie so retry can recover", async () => {
  const response = await GET(request("GET", "tampered"));
  expect(response.status).toBe(400);
  expect(response.cookies.get(CART_COOKIE_NAME)?.maxAge).toBe(0);
  expect(searchCatalogProducts).not.toHaveBeenCalled();
});

it("does not label a catalog USD total as the selected EUR currency", async () => {
  const saved = writeCart([{ accountId: "account-a", sku: "SKU-1", quantity: 1 }], "user-a");
  const response = await GET(new NextRequest("http://localhost/api/cart", {
    headers: { Cookie: `${CART_COOKIE_NAME}=${saved}`, "x-selected-currency": "EUR" },
  }));
  expect(response.status).toBe(502);
  expect((await response.json()).error).toContain("selected currency");
});
