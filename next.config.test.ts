import { describe, it, expect } from "vitest";
import nextConfig from "./next.config.mjs";

describe("Quotes navigation — /invoices legacy URL alias", () => {
  it("redirects /invoices to /quotes so existing links keep working", async () => {
    const redirects = await nextConfig.redirects();
    const invoicesRedirect = redirects.find((r: any) => r.source === "/invoices");
    expect(invoicesRedirect).toBeDefined();
    expect(invoicesRedirect.destination).toBe("/quotes");
  });
});
