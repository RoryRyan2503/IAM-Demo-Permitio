import { beforeEach, expect, it, vi } from "vitest";
import { evaluateAccess, toTrustFrameworkRequest } from "./decisions";
import { pingRequest, isPdpConfigured } from "./client";

vi.mock("./client", () => ({
  pingRequest: vi.fn(),
  isPdpConfigured: vi.fn(),
  getPdpBaseUrl: () => "https://pdp.example.test",
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(isPdpConfigured).mockReturnValue(true);
});

const decisionRequest = {
  subject: { id: "test-user", role: "buyer", attributes: {} },
  resource: { type: "products", attributes: {} },
  action: "view",
};

it("posts directly to the configured PDP URL with the pass-through header", async () => {
  vi.mocked(pingRequest).mockResolvedValue({ decision: "DENY", authorised: false, statements: {} });

  await evaluateAccess(decisionRequest);

  expect(pingRequest).toHaveBeenCalledWith(
    "https://pdp.example.test",
    "",
    expect.objectContaining({
      method: "POST",
      headers: { requestType: "pass-through" },
      body: toTrustFrameworkRequest(decisionRequest),
    })
  );
});

it.each(["PERMIT", "DENY"] as const)("preserves a remote %s decision with an empty statements object", async (decision) => {
  vi.mocked(pingRequest).mockResolvedValue({
    decision,
    authorised: decision === "PERMIT",
    statements: {},
  });

  const result = await evaluateAccess(decisionRequest);

  expect(result.engine).toBe("pingauthorize");
  expect(result.effect).toBe(decision === "PERMIT" ? "Permit" : "Deny");
});

it.each([
  [{ name: "Policy advice" }],
  { "statement-id": { name: "Policy advice" } },
])("reads advice from array and keyed-object statements", async (statements) => {
  vi.mocked(pingRequest).mockResolvedValue({ decision: "PERMIT", authorised: true, statements });

  expect(await evaluateAccess(decisionRequest)).toMatchObject({
    effect: "Permit",
    engine: "pingauthorize",
    reason: "Policy advice",
  });
});

it("honors an explicit authorization denial even when the decision says PERMIT", async () => {
  vi.mocked(pingRequest).mockResolvedValue({ decision: "PERMIT", authorised: false, statements: {} });

  expect(await evaluateAccess(decisionRequest)).toMatchObject({ effect: "Deny", engine: "pingauthorize" });
});

it("still rejects indeterminate decisions for the provider to handle", async () => {
  vi.mocked(pingRequest).mockResolvedValue({ decision: "INDETERMINATE", statements: {} });

  await expect(evaluateAccess(decisionRequest)).rejects.toThrow("INDETERMINATE");
});

it("sends authenticated identity, role, action, resource and account context to PingAuthorize", () => {
  const request = toTrustFrameworkRequest({
    subject: {
      id: "dynamo-user-id",
      role: "buyer",
      persona: "general",
      isSuperUser: false,
      attributes: {
        honId: "honeywell-id",
        selectedAccountId: "sold-to-id",
        activeSalesArea: "1265_10",
        allowedSalesOrgs: ["1265", "1266"],
        toolIds: ["TL001"],
      },
    },
    resource: { type: "products", attributes: {} },
    action: "view",
  });

  expect(request).toMatchObject({
    domain: "HonEcom",
    service: "Commerce.Products",
    action: "view",
    attributes: {
      userId: "dynamo-user-id",
      honId: "honeywell-id",
      role: "buyer",
      selectedAccountId: "sold-to-id",
      activeSalesArea: "1265_10",
      allowedSalesOrgs: "1265,1266",
      toolIds: "TL001",
      isSuperUser: "false",
    },
  });
});
