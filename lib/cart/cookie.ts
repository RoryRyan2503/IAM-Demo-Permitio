import { createHmac, timingSafeEqual } from "crypto";

export const CART_COOKIE_NAME = "iam_cart";
export const CART_MAX_AGE = 7 * 24 * 60 * 60;
export const MAX_CART_LINES = 20;

export interface CartLine {
  accountId: string;
  sku: string;
  quantity: number;
}

export class CartError extends Error {
  constructor(message: string, public readonly statusCode: number, public readonly clearCookie = false) {
    super(message);
    this.name = "CartError";
  }
}

function signature(payload: string): Buffer {
  const secret = process.env.SESSION_SECRET || process.env.MOCK_IDP_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new CartError("Cart signing requires SESSION_SECRET (at least 32 characters) on the server.", 503);
  }
  return createHmac("sha256", secret).update(`iam-cart-v1.${payload}`).digest();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isLine(value: unknown): value is CartLine {
  return isRecord(value)
    && typeof value.accountId === "string" && value.accountId.length > 0 && value.accountId.length <= 256
    && typeof value.sku === "string" && value.sku.length > 0 && value.sku.length <= 128
    && typeof value.quantity === "number" && Number.isInteger(value.quantity)
    && value.quantity >= 1 && value.quantity <= 999;
}

function invalidCookie(): never {
  throw new CartError("Saved cart is invalid or expired. Retry to start a new cart.", 400, true);
}

export function readCart(value: string | undefined, userId: string): CartLine[] {
  if (!value) return [];
  if (value.length > 3500) return invalidCookie();
  const [payload, mac, extra] = value.split(".");
  if (!payload || !mac || extra !== undefined || !/^[A-Za-z0-9_-]+$/.test(payload)
      || !/^[A-Za-z0-9_-]{43}$/.test(mac)) return invalidCookie();
  if (!timingSafeEqual(signature(payload), Buffer.from(mac, "base64url"))) return invalidCookie();

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return invalidCookie();
  }
  if (!isRecord(decoded) || decoded.version !== 1 || typeof decoded.userId !== "string"
      || typeof decoded.expiresAt !== "number" || decoded.expiresAt <= Date.now()
      || !Array.isArray(decoded.items) || decoded.items.length > MAX_CART_LINES
      || !decoded.items.every(isLine)) return invalidCookie();
  return decoded.userId === userId ? decoded.items : [];
}

export function writeCart(items: CartLine[], userId: string): string {
  if (!items.every(isLine)) {
    throw new CartError("Cart contains an unsupported product or account identifier.", 400);
  }
  if (items.length > MAX_CART_LINES) {
    throw new CartError(`Demo cart holds up to ${MAX_CART_LINES} product lines across accounts. Remove an item first.`, 409);
  }
  const payload = Buffer.from(JSON.stringify({
    version: 1, userId, expiresAt: Date.now() + CART_MAX_AGE * 1000, items,
  })).toString("base64url");
  const value = `${payload}.${signature(payload).toString("base64url")}`;
  if (value.length > 3500) {
    throw new CartError("Demo cart cookie is full. Remove an item before adding another.", 413);
  }
  return value;
}

export const cartCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/cart",
  maxAge: CART_MAX_AGE,
};
