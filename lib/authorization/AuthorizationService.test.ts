import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { checkAccess } from "./AuthorizationService";
import { getAuthorizationProvider } from "./providerFactory";
import { clearDecisionCache } from "./decisionCache";
import { AuthorizationUnavailableError, type AuthorizationProvider } from "./providers/AuthorizationProvider";

vi.mock("./providerFactory", () => ({
  getAuthorizationProvider: vi.fn(),
  getProviderByName: vi.fn(),
}));

const provider: AuthorizationProvider = {
  getProviderName: () => "pingauthorize",
  checkAccess: vi.fn(),
  checkAccessDetailed: vi.fn(),
  getConnectivityStatus: vi.fn(),
};

beforeEach(() => {
  vi.resetAllMocks();
  clearDecisionCache();
  vi.mocked(getAuthorizationProvider).mockReturnValue(provider);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

it("propagates unavailable errors as 503 instead of caching a false permission", async () => {
  vi.mocked(provider.checkAccessDetailed)
    .mockRejectedValueOnce(new AuthorizationUnavailableError())
    .mockResolvedValueOnce({ allowed: true, engine: "pingauthorize", latencyMs: 1 });

  await expect(checkAccess("test-user", "view", "products")).rejects.toMatchObject({ statusCode: 503 });
  expect(await checkAccess("test-user", "view", "products")).toBe(true);
  expect(provider.checkAccessDetailed).toHaveBeenCalledTimes(2);
});
