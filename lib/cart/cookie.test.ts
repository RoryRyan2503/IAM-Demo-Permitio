import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readCart, writeCart, type CartLine } from "./cookie";

const line: CartLine = { accountId: "account-a", sku: "SKU-1", quantity: 2 };

beforeEach(() => vi.stubEnv("SESSION_SECRET", "test-cart-signing-secret-with-32-characters"));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

it("preserves a signed cart across requests but isolates another user", () => {
  const cookie = writeCart([line], "user-a");
  expect(readCart(cookie, "user-a")).toEqual([line]);
  expect(readCart(cookie, "user-b")).toEqual([]);
});

it("rejects tampering and expired carts rather than trusting browser quantities", () => {
  vi.useFakeTimers();
  const cookie = writeCart([line], "user-a");
  const [payload, signature] = cookie.split(".");
  const tampered = Buffer.from(Buffer.from(payload, "base64url").toString().replace('"quantity":2', '"quantity":999')).toString("base64url");
  expect(() => readCart(`${tampered}.${signature}`, "user-a")).toThrow("invalid or expired");
  vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);
  expect(() => readCart(cookie, "user-a")).toThrow("invalid or expired");
});

it("rejects oversized carts instead of silently dropping lines", () => {
  expect(() => writeCart(Array.from({ length: 21 }, (_, i) => ({ ...line, sku: `SKU-${i}` })), "user-a"))
    .toThrow("20 product lines");
  expect(() => writeCart(Array.from({ length: 20 }, (_, i) => ({
    ...line, accountId: "a".repeat(200), sku: `${i}-${"s".repeat(100)}`,
  })), "user-a")).toThrow("cookie is full");
});
