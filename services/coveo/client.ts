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
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value * 100);
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
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
  const configuredToken = process.env.https://devapi.portal.honeywell.com/pingauthorize/rest/ping/search/v2?appId=a7wnc51036b9?.trim();
  const configuredHonId = process.env.COVEO_TOKEN_HON_ID?.trim();
  let token = session.accessToken;
  if (configuredToken) {
    if (process.env.NODE_ENV === "production") {
      throw new CoveoApiError("Static Coveo test tokens are disabled in production. Use portal OIDC authentication.", 503);
    }
    if (!configuredHonId || configuredHonId !== honId) {
      throw new CoveoApiError("The configured Coveo test token is not assigned to this Honeywell ID. Sign in as its matching user or use portal OIDC authentication.", 403);
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
    throw new CoveoApiError("Local mock login does not provide a dev-portal token. For local testing, configure COVEO_VALIDATED_TOKEN and its matching COVEO_TOKEN_HON_ID on the server, or sign in through portal OIDC.", 403);
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
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new CoveoApiError("Could not reach the Coveo/PingAuthorize service.", 502);
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
    const reason = response.status === 401 || response.status === 403
      ? " Verify the portal token and its authorized Honeywell ID/Sold-To combination."
      : " The dev-portal gateway could not complete this request; compare the same user, Sold-To and sales areas in Bruno.";
    throw new CoveoApiError(`Coveo service returned HTTP ${response.status}.${reason}${reference}`,
      response.status === 401 || response.status === 403 ? 403 : 502);
  }
  return payload;
}

export interface CoveoProduct {
  id: string;
  name: string;
  description: string;
  price: number | null;
  sku: string;
  sales_org_id: string;
  category: string;
  currency: string;
  image_url: string | null;
  created_at: string;
  source?: "Coveo";
}

function normalizeProduct(value: unknown, fallbackSalesOrg: string, fallbackCurrency: string): CoveoProduct {
  const item = record(value);
  const raw = record(item.raw);
  const source = { ...item, ...raw };
  const priceInCents = firstValue(source, ["price_in_cents", "priceInCents"]);
  const price = priceInCents !== undefined ? Number(priceInCents) : cents(
    firstValue(source, ["ec_price", "price", "unit_price", "unitPrice", "listPrice"])
  );
  const image = firstValue(source, ["image_url", "imageUrl", "ec_image", "image", "ec_images"]);
  const sku = text(firstValue(source, ["sku", "product_sku", "productCode", "ec_sku", "partNumber", "uniqueId"]));

  return {
    id: text(firstValue(source, ["id", "product_id", "productId", "uniqueId", "ec_item_group_id"]), sku),
    name: text(firstValue(source, ["name", "product_name", "productName", "ec_name", "title"]), "Product"),
    description: text(firstValue(source, ["description", "product_description", "ec_description", "excerpt"])),
    price: price !== null && Number.isFinite(price) ? price : null,
    sku,
    sales_org_id: text(firstValue(source, ["sales_org_id", "salesOrg", "sales_org", "salesOrganization"]), fallbackSalesOrg),
    category: text(firstValue(source, ["category", "categories", "ec_category"]), "Products"),
    currency: text(firstValue(source, ["currency", "currencyCode"]), fallbackCurrency),
    image_url: text(image) || null,
    created_at: text(firstValue(source, ["created_at", "createdAt", "date"])),
  };
}

function searchResults(payload: unknown): { items: unknown[]; total: number } {
  const root = record(payload);
  const data = record(root.data);
  const results = firstValue(root, ["results", "items"]) ?? firstValue(data, ["results", "items"]);
  const items = Array.isArray(results)
    ? results
    : Array.isArray(root.data)
      ? root.data
      : [];
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
}): Promise<{ products: CoveoProduct[]; total: number }> {
  const account = requireAccount(options.userContext);
  const allowedOrgs = new Set(options.userContext.selectedSalesOrgs);
  const areas = account.salesOrgList.filter((area) => allowedOrgs.has(area.salesOrg));
  if (areas.length === 0) {
    throw new CoveoApiError("No authorized sales organizations are available for this account.", 403);
  }

  const activeArea = areas.find((area) => area.salesArea === options.userContext.activeSalesArea) ?? areas[0];
  const salesCombination = `.*(${areas
    .map((area) => `${area.salesOrg}_${area.distributionChannel}_${area.division}`)
    .join("|")}): active-.*`;
  const headers = authHeaders(options.session, options.userContext);
  headers.selectedSoldToNumber = account.accountNumber;
  headers.selectedCurrency = activeArea.currency;

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
    currency: activeArea.currency,
    page: 0,
    perPage: 30,
    facets: [],
    sort: { sortCriteria: "relevance" },
    query: options.query,
    tab: "Products",
  });

  const result = searchResults(payload);
  return {
    products: result.items.map((item) => normalizeProduct(item, activeArea.salesOrg, activeArea.currency)),
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