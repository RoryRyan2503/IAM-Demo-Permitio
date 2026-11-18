import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { AuthSession, UserContext } from "@/types";
import { searchCatalogProducts } from "@/services/catalog/productSearch";
import { fetchCoveoOrderDetails, searchCoveoProducts } from "./client";

const options = {
  session: { accessToken: "demo-token-buyer" } as AuthSession,
  userContext: {
    user: { honId: "test-hon-id" },
    selectedAccount: { accountNumber: "0002031186", salesOrgList: [
      { salesOrg: "1265", distributionChannel: "10", division: "10", currency: "USD", salesArea: "1265_10" },
    ] },
    selectedSalesOrgs: ["1265"],
  } as UserContext,
  query: "sensor", userAgent: "test-agent", referer: "http://localhost:3000/products",
};

beforeEach(() => {
  vi.stubEnv("COVEO_VALIDATED_TOKEN", "");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it("uses only the ms dev Coveo endpoint and preserves the Postman request contract", async () => {
  vi.stubEnv("COVEO_SEARCH_URL", "");
  vi.stubEnv("COVEO_APP_ID", "");
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
    totalCount: 123,
    results: [{ uniqueId: "sensor-1", title: "Sensor", raw: { ec_sku: "SKU-1", ec_price: 12.5 } }],
  }), { status: 200 }));
  const result = await searchCatalogProducts({
    session: { accessToken: "test-portal-token" } as AuthSession,
    userContext: {
      user: { honId: "test-hon-id" },
      selectedAccount: { accountNumber: "0002031186", salesOrgList: [
        { salesOrg: "1265", distributionChannel: "10", division: "10", currency: "USD", salesArea: "1265_10" },
      ] },
      selectedSalesOrgs: ["1265"],
    } as UserContext,
    query: "sensor",
    userAgent: "test-agent",
    referer: "http://localhost:3000/products",
  });
  expect(fetchMock).toHaveBeenCalledOnce();
  const [url, request] = fetchMock.mock.calls[0];
  expect(String(url)).toBe("https://devapi.portal.honeywell.com/pingauthorize/rest/ping/search/v2?appId=a7wnc51036b9");
  expect(request?.method).toBe("POST");
  expect(request?.headers).toMatchObject({ honId: "test-hon-id", selectedSoldToNumber: "0002031186", selectedCurrency: "USD", validated_token: "test-portal-token" });
  expect(JSON.parse(String(request?.body))).toMatchObject({ query: "sensor", tab: "Products", currency: "USD", context: { salesCombination: ".*(1265_10_10): active-.*" } });
  expect(result.total).toBe(123);
  expect(result.products[0]).toMatchObject({ name: "Sensor", sku: "SKU-1", price: 1250, source: "Coveo" });
  expect(result.warnings).toEqual([]);
});

it("maps nested Coveo title.row product attributes and skips malformed records", async () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("COVEO_VALIDATED_TOKEN", "test-bruno-token");
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
    results: [
      {
        title: {
          row: {
            EC_parent_product_description: "Temperature Controller",
            EC_product_short_description: "Industrial temperature controller",
            EC_SKU_ID: "TC-100",
            EC_product_id: "product-100",
            EC_domain: "Building Automation",
            EC_category: "Controllers",
            EC_country: "US",
          },
        },
      },
      { title: { row: { unrelated: "incomplete record" } } },
      null,
    ],
  })));

  const result = await searchCoveoProducts({
    ...options,
    session: { accessToken: "test-portal-token" } as AuthSession,
    selectedCurrency: "EUR",
  });

  expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
    honId: "test-hon-id",
    selectedSoldToNumber: "0002031186",
    selectedCurrency: "EUR",
  });
  expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ currency: "EUR" });
  expect(result.products).toEqual([
    expect.objectContaining({
      id: "TC-100",
      productId: "product-100",
      name: "Temperature Controller",
      description: "Industrial temperature controller",
      sku: "TC-100",
      domain: "Building Automation",
      category: "Controllers",
      country: "US",
      currency: "EUR",
    }),
  ]);
});

it("maps live lowercase metadata and keeps SKU variants in the same family distinct", async () => {
  const raw = {
    ec_product_id: "family-100-en",
    ec_sku_id: "SWITCH-100",
    ec_name: "SWITCH-100",
    ec_sku_description: "Eight-port industrial network switch",
    ec_parent_product_name: "Industrial Network Switches",
    ec_parent_product_description: "A family of managed switches.",
    ec_parent_product_long_description: "Product family features and benefits.",
    thumbnail: "https://images.example.test/switch-100",
    ec_price: 0.0001,
    currency: "USD",
    ec_brand: "Test Brand",
    business: ["Building Automation"],
    ec_product_category: ["Access Control", "Access Control|Network Transmission|Network Switch"],
    leaf_category: "Network Switch",
    ec_availability_country: ["nl", "be"],
    ec_country: "us",
    ec_domain: "catalog.example.test",
  };
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
    results: [
      { uniqueId: "index$file://100-en", title: "SWITCH-100", raw },
      { uniqueId: "index$file://101-en", title: "SWITCH-101", raw: { ...raw, ec_sku_id: "SWITCH-101", ec_name: "SWITCH-101" } },
    ],
  })));

  const result = await searchCoveoProducts({ ...options, session: { accessToken: "test-portal-token" } as AuthSession });

  expect(result.products[0]).toMatchObject({
    id: "SWITCH-100",
    sku: "SWITCH-100",
    productId: "family-100-en",
    name: "SWITCH-100",
    description: raw.ec_sku_description,
    familyName: raw.ec_parent_product_name,
    familyDescription: raw.ec_parent_product_description,
    longDescription: raw.ec_parent_product_long_description,
    image_url: raw.thumbnail,
    price: null,
    brand: "Test Brand",
    business: "Building Automation",
    categoryPath: ["Access Control", "Network Transmission", "Network Switch"],
    availableCountries: ["nl", "be"],
    country: "us",
    domain: "catalog.example.test",
  });
  expect(result.products[1]).toMatchObject({ id: "SWITCH-101", productId: "family-100-en" });
});

it.each([
  [0.0001, null], [0.004, null], [0.005, 1], [0.01, 1], [0, 0],
  ["Price on request", null], [" ", null], ["$12.50", 1250],
])("does not turn non-displayable catalog price %s into a free item", async (price, expected) => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
    results: [{ title: "Test product", raw: { ec_sku_id: "TEST-1", ec_price: price } }],
  })));

  const result = await searchCoveoProducts({ ...options, session: { accessToken: "test-portal-token" } as AuthSession });

  expect(result.products[0].price).toBe(expected);
});

it("rejects a successful response with no recognizable results array", async () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("COVEO_VALIDATED_TOKEN", "test-bruno-token");
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: {} })));

  await expect(searchCoveoProducts({
    ...options,
    session: { accessToken: "test-portal-token" } as AuthSession,
  })).rejects.toMatchObject({
    statusCode: 502,
    message: "Coveo returned an unexpected product response.",
  });
});

it("does not forward local demo tokens to the dev portal", async () => {
  vi.stubEnv("COVEO_VALIDATED_TOKEN", "");
  const fetchMock = vi.spyOn(globalThis, "fetch");
  await expect(searchCoveoProducts(options)).rejects.toMatchObject({ statusCode: 403 });
  expect(fetchMock).not.toHaveBeenCalled();
});

it("uses the configured portal token with each signed-in user's Honeywell ID", async () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("COVEO_VALIDATED_TOKEN", "test-bruno-token");
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(JSON.stringify({ results: [] })));
  await searchCoveoProducts(options);
  expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ validated_token: "test-bruno-token", honId: "test-hon-id" });
  await searchCoveoProducts({ ...options, userContext: { ...options.userContext, user: { ...options.userContext.user, honId: "another-user" } } });
  expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({ validated_token: "test-bruno-token", honId: "another-user" });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("preserves upstream rejection status and a safe request ID without exposing response bodies", async () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("COVEO_VALIDATED_TOKEN", "test-bruno-token");
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("sensitive response content", {
    status: 403, headers: { "x-request-id": "request-123" },
  }));
  await expect(searchCoveoProducts(options)).rejects.toMatchObject({
    statusCode: 403, message: expect.stringContaining("Request ID: request-123"),
  });
});

it("keeps a genuine upstream 502 distinct from token rejection", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response("gateway failure", { status: 502 }));
  await expect(searchCoveoProducts({ ...options, session: { accessToken: "test-portal-token" } as AuthSession }))
    .rejects.toMatchObject({ statusCode: 502, message: "The service is temporarily unavailable. Please try again shortly." });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("recovers after a transient gateway failure", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response("gateway failure", { status: 502 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ results: [{ uniqueId: "sensor-1", title: "Sensor" }] })));
  const result = await searchCoveoProducts({ ...options, session: { accessToken: "test-portal-token" } as AuthSession });
  expect(result.products[0].name).toBe("Sensor");
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("disables static portal test tokens in production", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("COVEO_VALIDATED_TOKEN", "test-bruno-token");
  const fetchMock = vi.spyOn(globalThis, "fetch");
  await expect(searchCoveoProducts(options)).rejects.toMatchObject({ statusCode: 503 });
  expect(fetchMock).not.toHaveBeenCalled();
});

it("uses the configured order-header URL and dynamic user/account context", async () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("COVEO_VALIDATED_TOKEN", "test-portal-token");
  vi.stubEnv("COVEO_APP_ID", "test-app");
  vi.stubEnv("COVEO_ORDER_HEADER_URL", "https://portal.example.test/order-header");
  vi.stubEnv("COVEO_ORDER_LINEITEM_URL", "https://portal.example.test/order-lines");
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(JSON.stringify({ data: [] })));
  await fetchCoveoOrderDetails({ session: options.session, userContext: options.userContext, orderNumber: "0265009149" });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(String(fetchMock.mock.calls[0][0])).toBe("https://portal.example.test/order-header?appId=test-app");
  expect(String(fetchMock.mock.calls[1][0])).toBe("https://portal.example.test/order-lines?appId=test-app");
  expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ honId: "test-hon-id", validated_token: "test-portal-token" });
  expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ soldToNumber: "0002031186", orderNumber: "0265009149" });
});