import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { checkAccessDetailed } from "@/lib/authorization/AuthorizationService";
import { AuthorizationUnavailableError } from "@/lib/authorization/providers/AuthorizationProvider";
import { GET } from "./route";

vi.mock("@/lib/api/validateRequest", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/validateRequest")>("@/lib/api/validateRequest");
  return {
    authErrorResponse: actual.authErrorResponse,
    validateRequest: vi.fn(async () => ({
      session: { userId: "test-user" },
      userContext: { user: { id: "test-user", role: "buyer" }, selectedAccount: { accountId: "account-b" } },
      permitContext: { selectedAccountId: "account-b" },
      trace: { tags: [], timestamp: 0 },
    })),
  };
});
vi.mock("@/lib/authorization/AuthorizationService", () => ({ checkAccessDetailed: vi.fn() }));
vi.mock("@/lib/crm/crmService", () => ({ getLastDataSource: () => "dynamodb" }));
vi.mock("@/lib/debug/traceStore", () => ({ finalizeTrace: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(checkAccessDetailed).mockResolvedValue({
    allowed: true, engine: "pingauthorize", latencyMs: 1, providerName: "pingauthorize",
  });
});

it("returns 503 without a partial permission map when one PDP check fails", async () => {
  vi.mocked(checkAccessDetailed).mockRejectedValueOnce(new AuthorizationUnavailableError());

  const response = await GET(new NextRequest("http://localhost/api/auth/permissions"));
  const body = await response.json();

  expect(response.status).toBe(503);
  expect(body).not.toHaveProperty("permissions");
  expect(body.error).toContain("temporarily unavailable");
});

it("returns a real denial and request-specific engine for the selected account", async () => {
  vi.mocked(checkAccessDetailed).mockResolvedValueOnce({
    allowed: false, engine: "pingauthorize", latencyMs: 1, providerName: "pingauthorize",
  });

  const response = await GET(new NextRequest("http://localhost/api/auth/permissions"));
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.permissions["view:products"]).toBe(false);
  expect(body.permissions["view_pricing:products"]).toBe(true);
  expect(body.authEngine).toBe("pingauthorize");
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(checkAccessDetailed).toHaveBeenCalledWith(
    "test-user", "view", "products", { selectedAccountId: "account-b" }, "buyer"
  );
});
