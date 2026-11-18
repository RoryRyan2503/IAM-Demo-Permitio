import { decodeJwt } from "jose";
import type { AuthSession, UserContext } from "@/types";

type JsonRecord = Record<string, unknown>;

const DEFAULT_APP_ID = "a7wnc51036b9";
const DEFAULT_SEARCH_URL =
  "https://devapi.portal.honeywell.com/pingauthorize/rest/ping/search/v2";
const DEFAULT_ORDER_HEADER_URL =
  "https://devapi.portal.honeywell.com/pingauthorize/v1/order-header-details";
const DEFAULT_ORDER_LINEITEM_URL =
  "https://devapi.portal.honeywell.com/pingauthorize/v1/order-lineitem-details";

export class CoveoApiError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = "CoveoApiError";
  }
}

function record(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function firstValue(source: JsonRecord, keys: string[]): unknown {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function text(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean).join(", ");
  return fallback;
}

function cents(value: unknown): number | null {
  const numeric = typeof value === "string" ? value.replace(/[^\d.-]/g, "") : value;
  if (typeof numeric !== "number" && (typeof numeric !== "string" || !/\d/.test(numeric))) return null;
  const parsed = Number(numeric);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  const rounded = Math.round(parsed * 100);
  // Do not display positive sub-cent catalog values as a free product.
  return parsed > 0 && rounded === 0 ? null : rounded;
}

function textList(value: unknown): string[] {
  return (Array.isArray(value) ? value : [value])
    .map((item) => text(item).trim())
    .filter(Boolean);
}

function imageUrl(value: unknown): string | null {
  for (const candidate of textList(value)) {
    try {
      const url = new URL(candidate);
      if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
    } catch {
      // Ignore non-URL image metadata; the UI has a missing-image placeholder.
    }
  }
  return null;
}

function endpointUrl(configuredUrl: string | undefined, defaultUrl: string): string {
  const url = new URL(configuredUrl || defaultUrl);
  url.searchParams.set("appId", process.env.COVEO_APP_ID || DEFAULT_APP_ID);
  return url.toString();
}

function requireAccount(userContext: UserContext) {
  const account = userContext.selectedAccount;
  if (!account) throw new CoveoApiError("Select an account before searching.", 400);
  if (!account.accountNumber) {
    throw new CoveoApiError("The selected account has no sold-to number configured.", 400);
  }
  return account;
}

function authHeaders(session: AuthSession, userContext: UserContext): Record<string, string> {
  const honId = userContext.user.honId;
  if (!honId) throw new CoveoApiError("The signed-in user has no Honeywell ID.", 400);
  const configuredToken = process.env.COVEO_VALIDATED_TOKEN?.trim();
  let token = session.accessToken;
  if (configuredToken) {
    const hostedDemoEnabled = process.env.DEMO_MODE === "true"
      && process.env.COVEO_ALLOW_STATIC_DEMO_TOKEN === "true";
    if (process.env.NODE_ENV === "production" && !hostedDemoEnabled) {
      throw new CoveoApiError("Static Coveo test tokens are disabled in production. For a hosted demo, explicitly enable DEMO_MODE and COVEO_ALLOW_STATIC_DEMO_TOKEN. Otherwise use portal OIDC authentication.", 503);
    }
    token = configuredToken;
  }
  if (!token) throw new CoveoApiError("A portal access token is required for Coveo.", 401);
  let claims: ReturnType<typeof decodeJwt> | undefined;
  try {
    claims = decodeJwt(token);
  } catch {
    claims = undefined;
  }
  if (!configuredToken && (token.startsWith("demo-token-") ||
      (claims?.iss && claims.iss === (process.env.MOCK_IDP_ISSUER || "local-mock-idp")))) {
    throw new CoveoApiError("Local mock login does not provide a dev-portal token. For local testing, configure COVEO_VALIDATED_TOKEN on the server, or sign in through portal OIDC.", 403);
  }
  if (claims?.exp !== undefined && claims.exp <= Math.floor(Date.now() / 1000)) {
    throw new CoveoApiError("The Coveo portal token has expired. Renew the portal session or the local test token.", 403);
  }
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    honId,
    validated_token: token,
  };
}

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  let response: Response;
  try {
    const request = {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store" as const,
    };
    response = await fetch(url, { ...request, signal: AbortSignal.timeout(15_000) });
    if ([502, 503, 504].includes(response.status)) {
      await response.body?.cancel();
      response = await fetch(url, { ...request, signal: AbortSignal.timeout(15_000) });
    }
  } catch {
    throw new CoveoApiError("The service is temporarily unavailable. Please try again shortly.", 502);
  }

  const responseText = await response.text();
  let payload: unknown;
  try {
    payload = responseText ? JSON.parse(responseText) : null;
  } catch {
    payload = { message: responseText };
  }

  if (!response.ok) {
    const requestId = ["x-request-id", "x-correlation-id", "x-amzn-requestid"]
      .map((header) => response.headers.get(header))
      .find((value) => value && /^[A-Za-z0-9._:-]{1,128}$/.test(value));
    const reference = requestId ? ` Request ID: ${requestId}.` : "";
    console.error("[Coveo] Upstream request failed", { status: response.status, requestId: requestId ?? null });
    const reason = response.status === 401 || response.status === 403
      ? "Access to this information was denied."
      : "The service is temporarily unavailable. Please try again shortly.";
    throw new CoveoApiError(`${reason}${reference}`,
      response.status === 401 || response.status === 403 ? 403 : 502);
  }
  return payload;
}

export interface CoveoProduct {
  id: string;
  productId: string;
  name: string;
  description: string;
  price: number | null;
  sku: string;
  sales_org_id: string;
  category: string;
  domain: string;
  country: string;
  currency: string;
  image_url: string | null;
  created_at: string;
  familyName: string;
  familyDescription: string;
  longDescription: string;
  brand: string;
  business: string;
  categoryPath: string[];
  availableCountries: string[];
  unitOfMeasure: string;
  source?: "Coveo";
}

function normalizeProduct(value: unknown, fallbackSalesOrg: string, fallbackCurrency: string): CoveoProduct | null {
  const item = record(value);
  const title = record(item.title);
  const row = record(title.row);
  const raw = record(item.raw);
  const source = { ...item, ...raw, ...row };
  const priceInCents = firstValue(source, ["price_in_cents", "priceInCents"]);
  const price = priceInCents !== undefined ? Number(priceInCents) : cents(
    firstValue(source, ["EC_price", "ec_price", "price", "unit_price", "unitPrice", "listPrice"])
  );
  const image = firstValue(source, [
    "image_url", "imageUrl", "thumbnail", "ec_thumbnails", "EC_image", "ec_image", "image", "ec_images",
    "ec_parent_product_primary_image_url", "ec_parent_product_thumbnail",
  ]);
  const sku = text(firstValue(source, ["ec_sku_id", "EC_SKU_ID", "sku_id", "sku", "product_sku", "productCode", "ec_sku", "partNumber"]));
  const productId = text(firstValue(source, [
    "ec_product_id", "EC_product_id", "EC_PRODUCT_ID", "product_id", "productId", "ec_item_group_id", "permanentid", "id", "uniqueId",
  ]));
  const name = text(firstValue(source, [
    "name", "product_name", "productName", "ec_name", "EC_parent_product_description",
  ]), text(item.title));
  const description = text(firstValue(source, [
    "ec_sku_description", "ec_shortdesc", "sku_description",
    "EC_product_short_description", "EC_PRODUCT_SHORT_DESCRIPTION", "EC_parent_product_short_description",
    "EC_short_description", "EC_SHORT_DESCRIPTION", "short_description",
    "shortDescription", "description", "product_description", "ec_description", "excerpt",
  ]));
  // A product family can contain multiple orderable SKUs.
  const id = sku || productId;
  const categoryPaths = textList(firstValue(source, ["ec_product_category", "product_category"]));
  const categoryPath = (categoryPaths.sort((a, b) => b.split("|").length - a.split("|").length)[0] ?? "")
    .split("|").filter(Boolean);

  if (!id) return null;

  return {
    id,
    name: name || sku || "Product",
    description,
    price: price !== null && Number.isFinite(price) ? price : null,
    sku,
    sales_org_id: text(firstValue(source, ["sales_org_id", "salesOrg", "sales_org", "salesOrganization", "EC_sales_org"]), fallbackSalesOrg),
    category: text(firstValue(source, ["EC_category", "category", "categories", "leaf_category", "category_name", "ec_category"])),
    currency: text(firstValue(source, ["currency", "currencyCode"]), fallbackCurrency),
    image_url: imageUrl(image),
    created_at: text(firstValue(source, ["created_at", "createdAt", "date"])),
    productId,
    domain: text(firstValue(source, ["ec_domain", "EC_domain", "EC_DOMAIN", "domain", "Domain"])),
    country: text(firstValue(source, ["ec_country", "EC_country", "EC_COUNTRY", "country", "Country"])),
    familyName: text(firstValue(source, ["ec_parent_product_name", "ec_parent_product_title"])),
    familyDescription: text(source.ec_parent_product_description),
    longDescription: text(source.ec_parent_product_long_description),
    brand: text(firstValue(source, ["ec_brand", "brand"])),
    business: text(source.business),
    categoryPath,
    availableCountries: textList(firstValue(source, ["ec_availability_country", "availability_country", "ec_parent_product_availability_country"])),
    unitOfMeasure: text(source.ec_unit_of_measure),
  };
}

function searchResults(payload: unknown): { items: unknown[]; total: number } {
  const root = record(payload);
  const data = record(root.data);
  const results = root.results ?? root.items ?? data.results ?? data.items
    ?? (Array.isArray(root.data) ? root.data : undefined);
  if (!Array.isArray(results)) {
    throw new CoveoApiError("Coveo returned an unexpected product response.", 502);
  }
  const items = results;
  const totalValue = firstValue(root, ["totalCount", "total", "total_count"])
    ?? firstValue(data, ["totalCount", "total", "total_count"]);
  const total = Number(totalValue);
  return { items, total: Number.isFinite(total) ? total : items.length };
}

export async function searchCoveoProducts(options: {
  session: AuthSession;
  userContext: UserContext;
  query: string;
  userAgent: string;
  referer: string;
  selectedCurrency?: string;
}): Promise<{ products: CoveoProduct[]; total: number }> {
  const account = requireAccount(options.userContext);
  const allowedOrgs = new Set(options.userContext.selectedSalesOrgs);
  const areas = account.salesOrgList.filter((area) => allowedOrgs.has(area.salesOrg));
  if (areas.length === 0) {
    throw new CoveoApiError("No authorized sales organizations are available for this account.", 403);
  }

  const activeArea = areas.find((area) => area.salesArea === options.userContext.activeSalesArea) ?? areas[0];
  const currency = options.selectedCurrency?.trim().toUpperCase()
    || process.env.NEXT_PUBLIC_COVEO_DEFAULT_CURRENCY?.trim().toUpperCase()
    || "USD";
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new CoveoApiError("The selected currency is invalid.", 400);
  }
  const salesCombination = `.*(${areas
    .map((area) => `${area.salesOrg}_${area.distributionChannel}_${area.division}`)
    .join("|")}): active-.*`;
  const headers = authHeaders(options.session, options.userContext);
  headers.selectedSoldToNumber = account.accountNumber;
  headers.selectedCurrency = currency;

  const url = endpointUrl(process.env.COVEO_SEARCH_URL, DEFAULT_SEARCH_URL);
  const payload = await postJson(url, headers, {
    trackingId: process.env.COVEO_TRACKING_ID || "ba-qa",
    clientId: process.env.COVEO_CLIENT_ID || "d7f8a163-5d30-45da-9387-791bfb4eaba3",
    context: {
      user: { userAgent: options.userAgent },
      view: { url: options.referer, referrer: options.referer },
      capture: true,
      cart: [],
      source: ["@coveo/headless@3.29.2"],
      usr_lang: "en",
      authenticated: true,
      toggleState: false,
      salesCombination,
      finalDtm: "us",
      dtm: "us",
      selecteddtm: null,
      originLevel2: "Products",
      pageReferrer: options.referer,
      soldToNumber: true,
    },
    language: "en",
    country: "us",
    currency,
    page: 0,
    perPage: 30,
    facets: [],
    sort: { sortCriteria: "relevance" },
    query: options.query,
    tab: "Products",
  });

  const result = searchResults(payload);
  const products = result.items
    .map((item) => normalizeProduct(item, activeArea.salesOrg, currency))
    .filter((product): product is CoveoProduct => product !== null);
  return {
    products,
    total: result.total,
  };
}

export async function fetchCoveoOrderDetails(options: {
  session: AuthSession;
  userContext: UserContext;
  orderNumber: string;
}): Promise<{ header: unknown; lineItems: unknown }> {
  const account = requireAccount(options.userContext);
  const headers = {
    ...authHeaders(options.session, options.userContext),
    "HON-Org-Id": process.env.COVEO_HON_ORG_ID || "HBT",
  };
  const body = {
    "HON-Org-Id": process.env.COVEO_HON_ORG_ID || "HBT",
    soldToNumber: account.accountNumber,
    orderNumber: options.orderNumber,
    sapClient: process.env.COVEO_SAP_CLIENT || "900",
    sapSource: process.env.COVEO_SAP_SOURCE || "BRP",
    languageCode: process.env.COVEO_LANGUAGE_CODE || "en",
  };

  const [header, lineItems] = await Promise.all([
    postJson(endpointUrl(process.env.COVEO_ORDER_HEADER_URL, DEFAULT_ORDER_HEADER_URL), headers, body),
    postJson(endpointUrl(process.env.COVEO_ORDER_LINEITEM_URL, DEFAULT_ORDER_LINEITEM_URL), headers, body),
  ]);
  return { header, lineItems };
}