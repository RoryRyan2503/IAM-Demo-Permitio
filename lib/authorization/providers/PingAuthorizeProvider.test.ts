import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { evaluateAccess } from "@/services/ping-authorize/decisions";
import { AuthorizationUnavailableError, type AuthorizationSubject } from "./AuthorizationProvider";
import { PingAuthorizeProvider } from "./PingAuthorizeProvider";

vi.mock("@/services/ping-authorize/decisions", () => ({
  evaluateAccess: vi.fn(),
  getPdpConnectivity: vi.fn(),
  toTrustFrameworkRequest: vi.fn(() => ({})),
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

it.each(["admin", "buyer"] as const)("does not substitute local %s permissions when the PDP is unavailable", async (role) => {
  vi.mocked(evaluateAccess).mockRejectedValue(new Error("PDP timeout"));
  const subject: AuthorizationSubject = { id: "test-user", role, attributes: {} };

  await expect(new PingAuthorizeProvider().checkAccessDetailed(subject, "products", "view"))
    .rejects.toBeInstanceOf(AuthorizationUnavailableError);
});

it.each(["Permit", "Deny"] as const)("preserves an actual PDP %s decision", async (effect) => {
  vi.mocked(evaluateAccess).mockResolvedValue({ effect, engine: "pingauthorize" });

  expect(await new PingAuthorizeProvider().checkAccessDetailed(
    { id: "test-user", role: "buyer", attributes: {} }, "products", "view"
  )).toMatchObject({ allowed: effect === "Permit", engine: "pingauthorize" });
});
