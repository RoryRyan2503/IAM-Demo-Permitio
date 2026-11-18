import { afterEach, expect, it, vi } from "vitest";
import { pingRequest } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

it.each([
  "https://pdp.example.test",
  "https://pdp.example.test/custom/decision/",
  "https://pdp.example.test/custom/decision?environment=test",
])("preserves the complete configured endpoint %s when no path is supplied", async (url) => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ decision: "DENY" })));
  vi.stubGlobal("fetch", fetchMock);

  await pingRequest(url, "", { method: "POST", body: { attributes: {} }, retries: 0 });

  expect(fetchMock).toHaveBeenCalledWith(url, expect.objectContaining({ method: "POST" }));
});

it("continues appending paths for Policy Manager requests", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", fetchMock);

  await pingRequest("https://pap.example.test/", "/v2/policy-manager/policies", { retries: 0 });

  expect(fetchMock).toHaveBeenCalledWith(
    "https://pap.example.test/v2/policy-manager/policies",
    expect.objectContaining({ method: "GET" })
  );
});
